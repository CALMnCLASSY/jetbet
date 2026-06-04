const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');
const { sendTelegramNotification } = require('../utils/telegram');
const { sendSlackMessage } = require('../utils/slack');
const { recordAffiliateDeposit } = require('../utils/affiliate');
const paystackService = require('../utils/paystackService');
const { validateDepositAmount, formatCurrency, convertToPaystackCurrency, convertToFlutterwaveCurrency } = require('../utils/currencyConfig');
const ExchangeRateService = require('../services/ExchangeRateService');

const router = express.Router();

// STK Push simulation (for testing)
router.post('/stk-push',
  authenticateToken,
  [
    body('amount').isNumeric().custom(value => {
      if (value < 349 || value > 150000) {
        throw new Error('Amount must be between KES 349 and KES 150,000');
      }
      return true;
    }),
    body('phoneNumber').matches(/^254[0-9]{9}$/).withMessage('Invalid phone number format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, phoneNumber } = req.body;
      const user = await User.findById(req.userId);

      // Create pending transaction
      const transaction = new Transaction({
        user: user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        balanceBefore: user.balance,
        balanceAfter: user.balance, // Will be updated when confirmed
        status: 'pending',
        description: `M-Pesa deposit of KES ${amount}`,
        mpesaPhoneNumber: phoneNumber
      });

      await transaction.save();

      // Simulate STK Push response
      const stkResponse = {
        MerchantRequestID: `MR${Date.now()}`,
        CheckoutRequestID: `CR${Date.now()}`,
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
        CustomerMessage: "Success. Request accepted for processing"
      };

      // Send Telegram notification to admin
      await sendTelegramNotification(
        `💰 STK Push Request!\n\n` +
        `User: ${user.username}\n` +
        `Phone: ${phoneNumber}\n` +
        `Amount: KES ${amount}\n` +
        `Transaction ID: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `⚠️ Please process this deposit manually through the admin panel.`
      );

      // Send Slack notification for deposit request
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:moneybag: *Deposit Request*\n` +
        `User: ${user.username}\n` +
        `Phone: ${phoneNumber}\n` +
        `Amount: KES ${amount}\n` +
        `Transaction ID: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
        `⚠️ Please process this deposit manually through the admin panel.`
      );

      res.json({
        message: 'STK Push sent successfully',
        transactionId: transaction.reference,
        merchantRequestId: stkResponse.MerchantRequestID,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        instructions: `Please complete the payment on your phone (${phoneNumber}) and wait for confirmation.`
      });

    } catch (error) {
      console.error('STK Push error:', error);
      res.status(500).json({ error: 'Failed to process STK push request' });
    }
  }
);

// Manual deposit confirmation (Admin only)
router.post('/confirm-deposit',
  authenticateToken,
  async (req, res) => {
    try {
      const { transactionId, mpesaReceiptNumber } = req.body;

      // Check if user is admin
      const admin = await User.findById(req.userId);
      if (!admin.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      const transaction = await Transaction.findOne({ reference: transactionId });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Transaction already processed' });
      }

      // Update user balance
      const user = await User.findById(transaction.user);
      user.balance += transaction.amount;
      await user.save();

      try {
        await recordAffiliateDeposit(user, transaction.amount);
      } catch (error) {
        console.error('Affiliate deposit tracking failed:', error.message);
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.balanceAfter = user.balance;
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      await transaction.save();

      // Send confirmation notification
      await sendTelegramNotification(
        `✅ Deposit Confirmed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: KES ${transaction.amount}\n` +
        `New Balance: KES ${user.balance}\n` +
        `M-Pesa Receipt: ${mpesaReceiptNumber}\n` +
        `Processed by: ${admin.username}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      res.json({
        message: 'Deposit confirmed successfully',
        transaction,
        newBalance: user.balance
      });

    } catch (error) {
      console.error('Deposit confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm deposit' });
    }
  }
);

// Cancel pending deposit (Admin only)
router.post('/cancel-deposit',
  authenticateToken,
  async (req, res) => {
    try {
      const { transactionId, reason } = req.body;

      const admin = await User.findById(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      const transaction = await Transaction.findOne({ reference: transactionId });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending deposits can be cancelled' });
      }

      transaction.status = 'cancelled';
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...(transaction.metadata || {}),
        cancelledBy: admin._id,
        cancelReason: reason || 'Cancelled by admin',
        cancelledAt: new Date()
      };

      await transaction.save();

      try {
        await sendTelegramNotification(
          `⛔ Deposit Cancelled\n\n` +
          `User ID: ${transaction.user}\n` +
          `Amount: KES ${transaction.amount}\n` +
          `Reference: ${transaction.reference}\n` +
          `Reason: ${reason || 'Not specified'}\n` +
          `Admin: ${admin.username || admin.email}\n` +
          `Time: ${new Date().toLocaleString()}`
        );
      } catch (notifyError) {
        console.error('Failed to send cancellation notification:', notifyError.message);
      }

      res.json({
        message: 'Deposit cancelled successfully',
        transaction
      });

    } catch (error) {
      console.error('Deposit cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel deposit' });
    }
  }
);

// Track deposit tab click
router.post('/deposit-tab-click', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // Send Slack notification for deposit tab click
    await sendSlackMessage(
      process.env.SLACK_WEBHOOK_DEPOSIT_TAB,
      `:credit_card: *Deposit Tab Accessed*\n` +
      `User: ${user.username}\n` +
      `Phone: ${user.fullPhone || 'N/A'}\n` +
      `Balance: KES ${user.balance.toFixed(2)}\n` +
      `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Deposit tab click tracking error:', error);
    res.status(500).json({ error: 'Failed to track deposit tab click' });
  }
});

// Get deposit instructions
router.get('/deposit-info', authenticateToken, async (req, res) => {
  try {
    res.json({
      paybillNumber: process.env.PAYBILL_NUMBER,
      accountNumber: process.env.ACCOUNT_NUMBER,
      instructions: [
        '1. Go to M-PESA on your phone',
        '2. Select Lipa na M-PESA',
        '3. Select Pay Bill',
        `4. Enter Business Number: ${process.env.PAYBILL_NUMBER}`,
        `5. Enter Account Number: ${process.env.ACCOUNT_NUMBER}`,
        '6. Enter the amount you want to deposit',
        '7. Enter your M-PESA PIN',
        '8. Confirm the payment',
        '9. Wait for SMS confirmation',
        '10. Your balance will be updated within 5 minutes'
      ],
      minDeposit: 10,
      maxDeposit: 50000
    });
  } catch (error) {
    console.error('Deposit info error:', error);
    res.status(500).json({ error: 'Failed to get deposit information' });
  }
});

// Request withdrawal
router.post('/withdraw',
  authenticateToken,
  [
    body('amount').isNumeric().custom(value => {
      if (value < 1200) {
        throw new Error('Minimum withdrawal amount is KES 1200');
      }
      if (value > 150000) {
        throw new Error('Maximum withdrawal amount is KES 150,000');
      }
      return true;
    }),
    body('payoutMethod').isIn(['mobile_money', 'bank_transfer']).withMessage('Invalid payout method'),
    body('payoutDetails').isObject().withMessage('Payout details are required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, payoutMethod, payoutDetails } = req.body;
      const user = await User.findById(req.userId);

      // Check if user has sufficient balance
      if (user.balance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          currentBalance: user.balance
        });
      }

      // Additional validation based on method
      if (payoutMethod === 'mobile_money' && !payoutDetails.phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required for mobile money withdrawal' });
      }
      if (payoutMethod === 'bank_transfer' && (!payoutDetails.bankName || !payoutDetails.accountNumber || !payoutDetails.accountName)) {
        return res.status(400).json({ error: 'Bank name, account number, and account name are required for bank transfer' });
      }

      // Deduct balance immediately
      const balanceBefore = user.balance;
      user.balance -= parseFloat(amount);
      await user.save();

      // Create pending withdrawal transaction
      const transaction = new Transaction({
        user: user._id,
        type: 'withdrawal',
        amount: parseFloat(amount),
        balanceBefore: balanceBefore,
        balanceAfter: user.balance,
        status: 'pending',
        description: `Withdrawal via ${payoutMethod === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'} of KES ${amount}`,
        mpesaPhoneNumber: payoutMethod === 'mobile_money' ? payoutDetails.phoneNumber : null,
        metadata: {
          payoutMethod,
          payoutDetails,
          withdrawalType: 'enhanced'
        }
      });

      await transaction.save();

      // Formulate payout info for notifications
      let payoutInfo = '';
      if (payoutMethod === 'mobile_money') {
        payoutInfo = `Method: Mobile Money\nPhone: ${payoutDetails.phoneNumber}`;
      } else {
        payoutInfo = `Method: Bank Transfer\nBank: ${payoutDetails.bankName}\nAccount: ${payoutDetails.accountNumber}\nName: ${payoutDetails.accountName}`;
      }

      // Send Telegram notification to admin
      await sendTelegramNotification(
        `💸 Withdrawal Request!\n\n` +
        `User: ${user.username}\n` +
        `${payoutInfo}\n` +
        `Amount: KES ${amount}\n` +
        `Transaction ID: ${transaction.reference}\n` +
        `New Balance: KES ${user.balance.toFixed(2)}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `⚠️ Please process this withdrawal manually.`
      );

      // Send Slack notification (using deposit channel as requested)
      const slackWebhook = process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST || process.env.SLACK_WEBHOOK_WITHDRAWAL_REQUEST;
      await sendSlackMessage(
        slackWebhook,
        `:money_with_wings: *New Withdrawal Request*\n` +
        `*User:* ${user.username}\n` +
        `*Amount:* KES ${amount}\n` +
        `*Method:* ${payoutMethod === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Transfer'}\n` +
        `*Details:*\n${payoutMethod === 'mobile_money' ? `   - Phone: ${payoutDetails.phoneNumber}` : `   - Bank: ${payoutDetails.bankName}\n   - Acc: ${payoutDetails.accountNumber}\n   - Name: ${payoutDetails.accountName}`}\n` +
        `*Transaction ID:* ${transaction.reference}\n` +
        `*New Balance:* KES ${user.balance.toFixed(2)}\n` +
        `*Time:* ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
        `⚠️ Please process this withdrawal request.`
      );

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully. Your balance has been deducted and the withdrawal is pending approval.',
        transactionId: transaction.reference,
        newBalance: user.balance,
        status: 'pending'
      });

    } catch (error) {
      console.error('Withdrawal request error:', error);
      res.status(500).json({ error: 'Failed to process withdrawal request' });
    }
  }
);

// Confirm withdrawal (Admin only)
router.post('/confirm-withdrawal',
  authenticateToken,
  async (req, res) => {
    try {
      const { transactionId, mpesaReceiptNumber } = req.body;

      // Check if user is admin
      const admin = await User.findById(req.userId);
      if (!admin.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      const transaction = await Transaction.findOne({ reference: transactionId });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Transaction already processed' });
      }

      if (transaction.type !== 'withdrawal') {
        return res.status(400).json({ error: 'Not a withdrawal transaction' });
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...(transaction.metadata || {}),
        approvalReceiptNumber: mpesaReceiptNumber || null,
        approvedBy: admin._id,
        approvedAt: new Date()
      };
      await transaction.save();

      const user = await User.findById(transaction.user);

      // Send confirmation notification
      await sendTelegramNotification(
        `✅ Withdrawal Completed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: KES ${transaction.amount}\n` +
        `Phone: ${transaction.mpesaPhoneNumber}\n` +
        `M-Pesa Receipt: ${mpesaReceiptNumber}\n` +
        `Processed by: ${admin.username}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      res.json({
        message: 'Withdrawal confirmed successfully',
        transaction
      });

    } catch (error) {
      console.error('Withdrawal confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm withdrawal' });
    }
  }
);

// Cancel withdrawal (Admin only) - Refunds balance
router.post('/cancel-withdrawal',
  authenticateToken,
  async (req, res) => {
    try {
      const { transactionId, reason } = req.body;

      const admin = await User.findById(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      const transaction = await Transaction.findOne({ reference: transactionId });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending withdrawals can be cancelled' });
      }

      if (transaction.type !== 'withdrawal') {
        return res.status(400).json({ error: 'Not a withdrawal transaction' });
      }

      // Refund the balance
      const user = await User.findById(transaction.user);
      user.balance += transaction.amount;
      await user.save();

      transaction.status = 'cancelled';
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      transaction.balanceAfter = user.balance; // Update to reflect refund
      transaction.metadata = {
        ...(transaction.metadata || {}),
        cancelledBy: admin._id,
        cancelReason: reason || 'Cancelled by admin',
        cancelledAt: new Date(),
        refunded: true
      };

      await transaction.save();

      await sendTelegramNotification(
        `⛔ Withdrawal Cancelled & Refunded\n\n` +
        `User: ${user.username}\n` +
        `Amount: KES ${transaction.amount}\n` +
        `Reference: ${transaction.reference}\n` +
        `Reason: ${reason || 'Not specified'}\n` +
        `Refunded Balance: KES ${user.balance.toFixed(2)}\n` +
        `Admin: ${admin.username}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      res.json({
        message: 'Withdrawal cancelled and balance refunded successfully',
        transaction,
        newBalance: user.balance
      });

    } catch (error) {
      console.error('Withdrawal cancellation error:', error);
      res.status(500).json({ error: 'Failed to cancel withdrawal' });
    }
  }
);

// ==================== PAYSTACK ENDPOINTS ====================

// Initialize Paystack deposit
router.post('/deposit-initialize',
  authenticateToken,
  [
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, withdrawalId } = req.body;
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate amount for user's currency
      const validation = validateDepositAmount(amount, user.currency);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Convert currency if needed (only KES and USD are supported by Paystack account)
      const conversion = convertToPaystackCurrency(amount, user.currency);
      if (conversion.error) {
        return res.status(400).json({ error: conversion.error });
      }

      const paystackAmount = conversion.paystackAmount;
      const paystackCurrency = conversion.paystackCurrency;

      // Create pending transaction (store in user's original currency)
      const transaction = new Transaction({
        user: user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: user.currency,
        balanceBefore: user.balance,
        balanceAfter: user.balance, // Will be updated when confirmed
        status: 'pending',
        description: `Paystack deposit of ${formatCurrency(amount, user.currency)}`,
        paymentProvider: 'paystack',
        metadata: {
          paystackCurrency: paystackCurrency,
          paystackAmount: paystackAmount,
          converted: conversion.converted,
          exchangeRate: conversion.exchangeRate || null,
          originalCurrency: user.currency,
          originalAmount: parseFloat(amount),
          withdrawalId: withdrawalId || null,
          isActivationFee: !!withdrawalId
        }
      });

      await transaction.save();

      // Notify immediately after saving the pending transaction (even if Paystack init fails)
      // This ensures you always see the user's requested amount in Slack.
      const currencyNote = conversion.converted
        ? ` (converted to ${formatCurrency(paystackAmount, 'USD')})`
        : '';
      const activationNote = withdrawalId ? ` (Activation Fee for ${withdrawalId})` : '';
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:moneybag: *Paystack Deposit Initiated (Pending)*${activationNote}\n` +
        `User: ${user.username}\n` +
        `Requested: ${formatCurrency(parseFloat(amount), user.currency)}${currencyNote}\n` +
        `Paystack Charge: ${formatCurrency(paystackAmount, paystackCurrency)}\n` +
        `Reference: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      // Initialize Paystack transaction with the converted currency/amount
      const paystackResult = await paystackService.initializeTransaction({
        email: user.email || `${user.username}@jetbet.com`,
        amount: paystackAmount,
        currency: paystackCurrency,
        reference: transaction.reference,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'], // All available payment methods
        metadata: {
          userId: user._id.toString(),
          username: user.username,
          transactionId: transaction._id.toString(),
          originalCurrency: user.currency,
          originalAmount: parseFloat(amount),
          callback_url: `${process.env.FRONTEND_URL}/deposit-success.html`
        }
      });

      if (!paystackResult.success) {
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          paystackInitError: paystackResult.error || 'Unknown Paystack init error'
        };
        await transaction.save();
        await sendSlackMessage(
          process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
          `:x: *Paystack Deposit Init Failed*\n` +
          `User: ${user.username}\n` +
          `Requested: ${formatCurrency(parseFloat(amount), user.currency)}${currencyNote}\n` +
          `Reference: ${transaction.reference}\n` +
          `Error: ${paystackResult.error || 'Unknown error'}\n` +
          `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
        );
        return res.status(400).json({
          error: 'Failed to initialize payment',
          details: paystackResult.error
        });
      }

      // Update transaction with Paystack details
      transaction.paystackReference = paystackResult.data.reference;
      transaction.paystackAccessCode = paystackResult.data.access_code;
      await transaction.save();

      // Send notification
      await sendTelegramNotification(
        `💳 Paystack Deposit Initiated!\\n\\n` +
        `User: ${user.username}\\n` +
        `Amount: ${formatCurrency(amount, user.currency)}${currencyNote}\\n` +
        `Currency: ${user.currency}\\n` +
        `Reference: ${transaction.reference}\\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      // Send Slack notification for deposit request
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:moneybag: *Paystack Deposit Request*\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(amount, user.currency)}${currencyNote}\n` +
        `Currency: ${user.currency}\n` +
        `Paystack Charge: ${formatCurrency(paystackAmount, paystackCurrency)}\n` +
        `Reference: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
        `💳 Payment method: Paystack`
      );

      res.json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorization_url: paystackResult.data.authorization_url,
          access_code: paystackResult.data.access_code,
          reference: paystackResult.data.reference,
          transactionId: transaction.reference,
          amount: paystackAmount, // Amount sent to Paystack
          currency: paystackCurrency, // Currency sent to Paystack
          originalAmount: parseFloat(amount), // User's original amount
          originalCurrency: user.currency, // User's original currency
          converted: conversion.converted
        }
      });

    } catch (error) {
      console.error('Deposit initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize deposit' });
    }
  }
);

// Verify Paystack deposit
router.post('/deposit-verify',
  authenticateToken,
  [
    body('reference').notEmpty().withMessage('Reference is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { reference } = req.body;
      const user = await User.findById(req.userId);

      // Find transaction
      const transaction = await Transaction.findOne({
        reference: reference,
        user: user._id
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'completed') {
        return res.json({
          success: true,
          message: 'Transaction already completed',
          newBalance: user.balance
        });
      }

      // Verify with Paystack
      const verificationResult = await paystackService.verifyTransaction(reference);

      if (!verificationResult.success) {
        return res.status(400).json({
          error: 'Verification failed',
          details: verificationResult.error
        });
      }

      const paymentData = verificationResult.data;

      // Check if payment was successful
      if (paymentData.status !== 'success') {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({
          error: 'Payment was not successful',
          status: paymentData.status
        });
      }

      // Update user balance
      user.balance += transaction.amount;
      await user.save();

      // Record affiliate deposit if applicable
      try {
        await recordAffiliateDeposit(user, transaction.amount);
      } catch (error) {
        console.error('Affiliate deposit tracking failed:', error.message);
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.balanceAfter = user.balance;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        paystackData: {
          channel: paymentData.channel,
          paidAt: paymentData.paidAt,
          customer: paymentData.customer
        }
      };
      await transaction.save();

      // Check if this is an activation fee for a withdrawal
      if (transaction.metadata && transaction.metadata.withdrawalId) {
        const withdrawalId = transaction.metadata.withdrawalId;
        const withdrawal = await Transaction.findById(withdrawalId);
        if (withdrawal && withdrawal.status === 'pending') {
          withdrawal.status = 'completed';
          withdrawal.processedAt = new Date();
          withdrawal.metadata = {
            ...(withdrawal.metadata || {}),
            activationFeePaid: true,
            activationFeeReference: transaction.reference,
            approvedAutomatically: true
          };
          await withdrawal.save();

          // Send Slack notification for automatic approval
          await sendSlackMessage(
            process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
            `:white_check_mark: *Withdrawal Automatically Approved*\n` +
            `User: ${user.username}\n` +
            `Withdrawal Amount: KES ${withdrawal.amount}\n` +
            `Activation Fee: KES ${transaction.amount}\n` +
            `Transaction ID: ${withdrawal.reference}\n` +
            `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
            `✅ Account reactivated and withdrawal completed.`
          );
        }
      }

      // Send confirmation notification
      await sendTelegramNotification(
        `✅ Paystack Deposit Confirmed!\\n\\n` +
        `User: ${user.username}\\n` +
        `Amount: ${formatCurrency(transaction.amount, user.currency)}\\n` +
        `Currency: ${user.currency}\\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\\n` +
        `Reference: ${reference}\\n` +
        `Channel: ${paymentData.channel}\\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      // Send Slack notification for confirmed deposit
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:white_check_mark: *Deposit Confirmed (Verified)*\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, user.currency)}\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\n` +
        `Reference: ${reference}\n` +
        `Channel: ${paymentData.channel}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      res.json({
        success: true,
        message: 'Deposit confirmed successfully',
        transaction: {
          reference: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status
        },
        newBalance: user.balance
      });

    } catch (error) {
      console.error('Deposit verification error:', error);
      res.status(500).json({ error: 'Failed to verify deposit' });
    }
  }
);

// Paystack webhook handler
router.post('/paystack-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];

    // Verify webhook signature
    if (!paystackService.verifyWebhookSignature(signature, req.body)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('📨 Paystack webhook received:', event.event);

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      // Find transaction
      const transaction = await Transaction.findOne({ reference });

      if (!transaction) {
        console.error('Transaction not found for reference:', reference);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Skip if already processed
      if (transaction.status === 'completed') {
        console.log('Transaction already completed:', reference);
        return res.json({ message: 'Already processed' });
      }

      // Update user balance
      const user = await User.findById(transaction.user);
      user.balance += transaction.amount;
      await user.save();

      // Record affiliate deposit
      try {
        await recordAffiliateDeposit(user, transaction.amount);
      } catch (error) {
        console.error('Affiliate deposit tracking failed:', error.message);
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.balanceAfter = user.balance;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        webhookData: data
      };
      await transaction.save();

      console.log('✅ Webhook processed successfully:', reference);

      // Send notification
      await sendTelegramNotification(
        `🎉 Automatic Deposit Confirmed (Webhook)!\\n\\n` +
        `User: ${user.username}\\n` +
        `Amount: ${formatCurrency(transaction.amount, transaction.currency)}\\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\\n` +
        `Reference: ${reference}`
      );

      // Send Slack notification for webhook deposit
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:tada: *Automatic Deposit Confirmed (Webhook)*\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, transaction.currency)}\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\n` +
        `Reference: ${reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );
    }

    res.json({ message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==================== FLUTTERWAVE ENDPOINTS ====================

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

/**
 * Helper: initialize a Flutterwave inline payment.
 * Returns { success, data } or { success: false, error }.
 */
async function initFlutterwavePayment({ tx_ref, amount, currency, email, meta }) {
  try {
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: process.env.FRONTEND_URL || 'https://jetbetaviator.com',
      customer: { email },
      customizations: {
        title: 'JetBet Deposit',
        logo: `${process.env.FRONTEND_URL || 'https://jetbetaviator.com'}/favicon.ico`
      },
      meta
    };

    const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (response.data && response.data.status === 'success') {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data?.message || 'FLW init failed' };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Flutterwave request error';
    return { success: false, error: msg };
  }
}

// Initialize Flutterwave deposit (with Paystack fallback)
router.post('/flw-deposit-initialize',
  authenticateToken,
  [
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { amount } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Validate amount for user currency
      const validation = validateDepositAmount(amount, user.currency);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Convert to FLW-supported currency if needed
      const conversion = await convertToFlutterwaveCurrency(amount, user.currency);
      if (conversion.error) {
        return res.status(400).json({ error: conversion.error });
      }

      const flwAmount = conversion.flwAmount;
      const flwCurrency = conversion.flwCurrency;
      const currencyNote = conversion.converted
        ? ` (converted to ${formatCurrency(flwAmount, 'USD')})`
        : '';

      // Create pending transaction stored in HOME currency
      const transaction = new Transaction({
        user: user._id,
        type: 'deposit',
        amount: parseFloat(amount),          // HOME currency amount
        currency: user.currency,
        balanceBefore: user.balance,
        balanceAfter: user.balance,
        status: 'pending',
        description: `Flutterwave deposit of ${formatCurrency(amount, user.currency)}`,
        paymentProvider: 'flutterwave',
        metadata: {
          flwCurrency,
          flwAmount,
          converted: conversion.converted,
          exchangeRate: conversion.exchangeRate || null,
          originalCurrency: user.currency,
          originalAmount: parseFloat(amount)
        }
      });
      await transaction.save();

      // Notify Slack early (so you always see the pending deposit)
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:airplane: *Flutterwave Deposit Initiated (Pending)*\n` +
        `User: ${user.username}\n` +
        `Requested: ${formatCurrency(parseFloat(amount), user.currency)}${currencyNote}\n` +
        `FLW Charge: ${formatCurrency(flwAmount, flwCurrency)}\n` +
        `Reference: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      // Attempt FLW initialization
      const flwResult = await initFlutterwavePayment({
        tx_ref: transaction.reference,
        amount: flwAmount,
        currency: flwCurrency,
        email: user.email || `${user.username}@jetbet.com`,
        meta: {
          userId: user._id.toString(),
          username: user.username,
          originalCurrency: user.currency,
          originalAmount: parseFloat(amount)
        }
      });

      if (flwResult.success) {
        // Update transaction with FLW link
        transaction.metadata = { ...transaction.metadata, flwLink: flwResult.data.link };
        await transaction.save();

        return res.json({
          success: true,
          provider: 'flutterwave',
          data: {
            payment_link: flwResult.data.link,
            tx_ref: transaction.reference,
            amount: flwAmount,
            currency: flwCurrency,
            originalAmount: parseFloat(amount),
            originalCurrency: user.currency,
            converted: conversion.converted
          }
        });
      }

      // ── Flutterwave failed → fall back to Paystack ──
      console.warn(`[FLW] Init failed (${flwResult.error}), falling back to Paystack for ${user.username}`);

      transaction.metadata = {
        ...transaction.metadata,
        flwInitError: flwResult.error,
        fallbackProvider: 'paystack'
      };
      transaction.paymentProvider = 'paystack'; // re-route to Paystack verify
      await transaction.save();

      // Paystack conversion
      const psConversion = convertToPaystackCurrency(amount, user.currency);
      if (psConversion.error) {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ error: psConversion.error });
      }

      const psResult = await paystackService.initializeTransaction({
        email: user.email || `${user.username}@jetbet.com`,
        amount: psConversion.paystackAmount,
        currency: psConversion.paystackCurrency,
        reference: transaction.reference,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'],
        metadata: {
          userId: user._id.toString(),
          username: user.username,
          originalCurrency: user.currency,
          originalAmount: parseFloat(amount)
        }
      });

      if (!psResult.success) {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ error: 'Both Flutterwave and Paystack failed to initialize payment.' });
      }

      transaction.paystackReference = psResult.data.reference;
      transaction.paystackAccessCode = psResult.data.access_code;
      await transaction.save();

      return res.json({
        success: true,
        provider: 'paystack',
        fallback: true,
        data: {
          authorization_url: psResult.data.authorization_url,
          access_code: psResult.data.access_code,
          reference: psResult.data.reference,
          amount: psConversion.paystackAmount,
          currency: psConversion.paystackCurrency,
          originalAmount: parseFloat(amount),
          originalCurrency: user.currency
        }
      });

    } catch (error) {
      console.error('FLW deposit initialize error:', error);
      res.status(500).json({ error: 'Failed to initialize deposit' });
    }
  }
);

// Verify Flutterwave deposit
router.post('/flw-deposit-verify',
  authenticateToken,
  [
    body('transaction_id').isNumeric().withMessage('FLW transaction_id is required'),
    body('tx_ref').notEmpty().withMessage('tx_ref (reference) is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { transaction_id, tx_ref } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Find the pending transaction by our tx_ref
      const transaction = await Transaction.findOne({ reference: tx_ref, user: user._id });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'completed') {
        return res.json({ success: true, message: 'Already completed', newBalance: user.balance });
      }

      // Verify with Flutterwave
      const verifyRes = await axios.get(
        `${FLW_BASE_URL}/transactions/${transaction_id}/verify`,
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
          timeout: 15000
        }
      );

      const flwData = verifyRes.data;
      if (!flwData || flwData.status !== 'success') {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ error: 'Flutterwave verification returned non-success status' });
      }

      const paymentStatus = flwData.data?.status;
      if (paymentStatus !== 'successful') {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ error: `Payment not successful. FLW status: ${paymentStatus}` });
      }

      // Credit the HOME currency amount (NOT the converted FLW amount)
      user.balance += transaction.amount;
      await user.save();

      try {
        await recordAffiliateDeposit(user, transaction.amount);
      } catch (err) {
        console.error('Affiliate deposit tracking failed:', err.message);
      }

      transaction.status = 'completed';
      transaction.balanceAfter = user.balance;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        flwTransactionId: transaction_id,
        flwVerifyData: {
          status: paymentStatus,
          channel: flwData.data?.payment_type,
          flwRef: flwData.data?.flw_ref
        }
      };
      await transaction.save();

      await sendTelegramNotification(
        `✅ Flutterwave Deposit Confirmed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, user.currency)}\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\n` +
        `FLW Ref: ${flwData.data?.flw_ref}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:white_check_mark: *Flutterwave Deposit Confirmed*\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, user.currency)}\n` +
        `New Balance: ${formatCurrency(user.balance, user.currency)}\n` +
        `Channel: ${flwData.data?.payment_type}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      res.json({
        success: true,
        message: 'Flutterwave deposit verified and balance credited',
        newBalance: user.balance
      });

    } catch (error) {
      console.error('FLW deposit verify error:', error);
      res.status(500).json({ error: 'Failed to verify Flutterwave deposit' });
    }
  }
);

// Poll Flutterwave deposit status
router.get('/flw-deposit-status',
  authenticateToken,
  async (req, res) => {
    try {
      const { ref } = req.query;
      if (!ref) return res.status(400).json({ error: 'ref query parameter is required' });

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const transaction = await Transaction.findOne({ reference: ref, user: user._id });
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

      res.json({
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        newBalance: transaction.status === 'completed' ? user.balance : null
      });
    } catch (error) {
      console.error('FLW deposit status error:', error);
      res.status(500).json({ error: 'Failed to get deposit status' });
    }
  }
);

module.exports = router;