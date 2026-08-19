const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticateToken } = require('../middleware/auth');
const { sendTelegramNotification } = require('../utils/telegram');
const { sendSlackMessage } = require('../utils/slack');
const { recordAffiliateDeposit } = require('../utils/affiliate');
const { validateDepositAmount, validateWithdrawalAmount, formatCurrency, convertToFlutterwaveCurrency } = require('../utils/currencyConfig');
const ExchangeRateService = require('../services/ExchangeRateService');

const router = express.Router();

// STK Push simulation (for Kenya / testing)
router.post('/stk-push',
  authenticateToken,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
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
      const userCurrency = user.currency || 'KES';

      const validation = validateDepositAmount(amount, userCurrency);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Create pending transaction
      const transaction = new Transaction({
        user: user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: userCurrency,
        balanceBefore: user.balance,
        balanceAfter: user.balance,
        status: 'pending',
        description: `M-Pesa deposit of ${formatCurrency(amount, userCurrency)}`,
        mpesaPhoneNumber: phoneNumber
      });

      await transaction.save();

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
        `Amount: ${formatCurrency(amount, userCurrency)}\n` +
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
        `Amount: ${formatCurrency(amount, userCurrency)}\n` +
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

      const admin = await User.findById(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }

      const transaction = await Transaction.findOne({ reference: transactionId });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Transaction already processed' });
      }

      const user = await User.findById(transaction.user);
      user.balance += transaction.amount;
      await user.save();

      try {
        await recordAffiliateDeposit(user, transaction.amount);
      } catch (error) {
        console.error('Affiliate deposit tracking failed:', error.message);
      }

      transaction.status = 'completed';
      transaction.balanceAfter = user.balance;
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      await transaction.save();

      const userCurrency = user.currency || 'KES';

      await sendTelegramNotification(
        `✅ Deposit Confirmed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
        `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
        `M-Pesa Receipt: ${mpesaReceiptNumber || 'N/A'}\n` +
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

      const user = await User.findById(transaction.user);
      const userCurrency = user?.currency || 'KES';

      try {
        await sendTelegramNotification(
          `⛔ Deposit Cancelled\n\n` +
          `User: ${user?.username || 'Unknown'}\n` +
          `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
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
    const userCurrency = user?.currency || 'KES';

    await sendSlackMessage(
      process.env.SLACK_WEBHOOK_DEPOSIT_TAB,
      `:credit_card: *Deposit Tab Accessed*\n` +
      `User: ${user.username}\n` +
      `Phone: ${user.fullPhone || 'N/A'}\n` +
      `Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
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
    const user = await User.findById(req.userId);
    const userCurrency = user?.currency || 'KES';
    const limits = require('../utils/currencyConfig').getDepositLimits(userCurrency);

    res.json({
      paybillNumber: process.env.PAYBILL_NUMBER,
      accountNumber: process.env.ACCOUNT_NUMBER,
      instructions: [
        '1. Go to M-PESA or your mobile banking app',
        '2. Select Lipa na M-PESA or PayBill',
        `3. Enter Business Number: ${process.env.PAYBILL_NUMBER || '793174'}`,
        `4. Enter Account Number: ${process.env.ACCOUNT_NUMBER || '745087451'}`,
        '5. Enter the amount you want to deposit',
        '6. Enter your PIN and confirm payment',
        '7. Your balance will be updated instantly or within 5 minutes'
      ],
      minDeposit: limits.min,
      maxDeposit: limits.max,
      currency: userCurrency
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
    body('amount').isNumeric().withMessage('Amount must be a valid number'),
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
      const userCurrency = user.currency || 'KES';
      const numAmount = parseFloat(amount);

      // Validate withdrawal limit for user currency
      const validation = validateWithdrawalAmount(numAmount, userCurrency);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Check if user has sufficient balance
      if (user.balance < numAmount) {
        return res.status(400).json({
          error: `Insufficient balance. Available: ${formatCurrency(user.balance, userCurrency)}`,
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
      user.balance -= numAmount;
      await user.save();

      // Create pending withdrawal transaction
      const transaction = new Transaction({
        user: user._id,
        type: 'withdrawal',
        amount: numAmount,
        currency: userCurrency,
        balanceBefore: balanceBefore,
        balanceAfter: user.balance,
        status: 'pending',
        description: `Withdrawal via ${payoutMethod === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'} of ${formatCurrency(numAmount, userCurrency)}`,
        mpesaPhoneNumber: payoutMethod === 'mobile_money' ? payoutDetails.phoneNumber : null,
        metadata: {
          payoutMethod,
          payoutDetails,
          withdrawalType: 'enhanced'
        }
      });

      await transaction.save();

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
        `Amount: ${formatCurrency(numAmount, userCurrency)}\n` +
        `Transaction ID: ${transaction.reference}\n` +
        `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `⚠️ Please process this withdrawal manually.`
      );

      // Send Slack notification
      const slackWebhook = process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST || process.env.SLACK_WEBHOOK_WITHDRAWAL_REQUEST;
      await sendSlackMessage(
        slackWebhook,
        `:money_with_wings: *New Withdrawal Request*\n` +
        `*User:* ${user.username}\n` +
        `*Amount:* ${formatCurrency(numAmount, userCurrency)}\n` +
        `*Method:* ${payoutMethod === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Transfer'}\n` +
        `*Details:*\n${payoutMethod === 'mobile_money' ? `   - Phone: ${payoutDetails.phoneNumber}` : `   - Bank: ${payoutDetails.bankName}\n   - Acc: ${payoutDetails.accountNumber}\n   - Name: ${payoutDetails.accountName}`}\n` +
        `*Transaction ID:* ${transaction.reference}\n` +
        `*New Balance:* ${formatCurrency(user.balance, userCurrency)}\n` +
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

      const admin = await User.findById(req.userId);
      if (!admin || !admin.isAdmin) {
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
      const userCurrency = user?.currency || 'KES';

      await sendTelegramNotification(
        `✅ Withdrawal Completed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
        `Phone: ${transaction.mpesaPhoneNumber || 'N/A'}\n` +
        `Receipt: ${mpesaReceiptNumber || 'N/A'}\n` +
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

      const user = await User.findById(transaction.user);
      user.balance += transaction.amount;
      await user.save();

      transaction.status = 'cancelled';
      transaction.processedBy = admin._id;
      transaction.processedAt = new Date();
      transaction.balanceAfter = user.balance;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        cancelledBy: admin._id,
        cancelReason: reason || 'Cancelled by admin',
        cancelledAt: new Date(),
        refunded: true
      };

      await transaction.save();

      const userCurrency = user?.currency || 'KES';

      await sendTelegramNotification(
        `⛔ Withdrawal Cancelled & Refunded\n\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
        `Reference: ${transaction.reference}\n` +
        `Reason: ${reason || 'Not specified'}\n` +
        `Refunded Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
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

// ==================== FLUTTERWAVE ENDPOINTS ====================

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';
const getFlwSecretKey = () => (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();

/**
 * Helper: initialize a Flutterwave inline payment.
 */
async function initFlutterwavePayment({ tx_ref, amount, currency, email, redirect_url, meta }) {
  try {
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: redirect_url || process.env.FRONTEND_URL || 'https://jetbetaviator.com/dashboard.html',
      customer: { email },
      customizations: {
        title: 'JetBet Deposit',
        logo: `${process.env.FRONTEND_URL || 'https://jetbetaviator.com'}/images/jetbetcasino-logo.jpeg`
      },
      meta
    };

    const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${getFlwSecretKey()}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (response.data && response.data.status === 'success') {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.data?.message || 'FLW initialization failed' };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Flutterwave request error';
    return { success: false, error: msg };
  }
}

// Initialize Flutterwave deposit
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

      const { amount, withdrawalId, redirectUrl } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const userCurrency = user.currency || 'USD';

      // Validate amount for user currency
      const validation = validateDepositAmount(amount, userCurrency);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Convert to FLW-supported currency if needed
      const conversion = await convertToFlutterwaveCurrency(amount, userCurrency);
      if (conversion.error) {
        return res.status(400).json({ error: conversion.error });
      }

      const flwAmount = conversion.flwAmount;
      const flwCurrency = conversion.flwCurrency;
      const currencyNote = conversion.converted
        ? ` (converted to ${formatCurrency(flwAmount, 'USD')})`
        : '';
      const activationNote = withdrawalId ? ` (Activation Fee for ${withdrawalId})` : '';

      // Create pending transaction stored in user's HOME currency
      const transaction = new Transaction({
        user: user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: userCurrency,
        balanceBefore: user.balance,
        balanceAfter: user.balance,
        status: 'pending',
        description: `Deposit of ${formatCurrency(amount, userCurrency)}`,
        paymentProvider: 'flutterwave',
        metadata: {
          flwCurrency,
          flwAmount,
          converted: conversion.converted,
          exchangeRate: conversion.exchangeRate || null,
          originalCurrency: userCurrency,
          originalAmount: parseFloat(amount),
          withdrawalId: withdrawalId || null,
          isActivationFee: !!withdrawalId
        }
      });
      await transaction.save();

      // Early Slack notification
      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:airplane: *Flutterwave Deposit Initiated (Pending)*${activationNote}\n` +
        `User: ${user.username}\n` +
        `Requested: ${formatCurrency(parseFloat(amount), userCurrency)}${currencyNote}\n` +
        `FLW Charge: ${formatCurrency(flwAmount, flwCurrency)}\n` +
        `Reference: ${transaction.reference}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      // Attempt FLW initialization
      const flwResult = await initFlutterwavePayment({
        tx_ref: transaction.reference,
        amount: flwAmount,
        currency: flwCurrency,
        redirect_url: redirectUrl,
        email: user.email || `${user.username}@jetbet.com`,
        meta: {
          userId: user._id.toString(),
          username: user.username,
          originalCurrency: userCurrency,
          originalAmount: parseFloat(amount),
          withdrawalId: withdrawalId || null
        }
      });

      if (flwResult.success) {
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
            originalCurrency: userCurrency,
            converted: conversion.converted
          }
        });
      }

      transaction.status = 'failed';
      transaction.metadata = {
        ...transaction.metadata,
        flwInitError: flwResult.error || 'Unknown Flutterwave initialization error'
      };
      await transaction.save();

      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:x: *Flutterwave Deposit Init Failed*\n` +
        `User: ${user.username}\n` +
        `Requested: ${formatCurrency(parseFloat(amount), userCurrency)}${currencyNote}\n` +
        `Reference: ${transaction.reference}\n` +
        `Error: ${flwResult.error || 'Unknown error'}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      return res.status(400).json({
        error: 'Failed to initialize payment',
        details: flwResult.error
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

      // Find the pending transaction by reference
      const transaction = await Transaction.findOne({ reference: tx_ref, user: user._id });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'completed') {
        return res.json({ success: true, message: 'Already completed', newBalance: user.balance });
      }

      // Verify with Flutterwave API
      const verifyRes = await axios.get(
        `${FLW_BASE_URL}/transactions/${transaction_id}/verify`,
        {
          headers: { Authorization: `Bearer ${getFlwSecretKey()}` },
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

      // Credit the HOME currency amount (stored in transaction.amount)
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

      const userCurrency = user.currency || 'USD';

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

          await sendSlackMessage(
            process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
            `:white_check_mark: *Withdrawal Automatically Approved (Flutterwave)*\n` +
            `User: ${user.username}\n` +
            `Withdrawal Amount: ${formatCurrency(withdrawal.amount, userCurrency)}\n` +
            `Activation Fee: ${formatCurrency(transaction.amount, userCurrency)}\n` +
            `Transaction ID: ${withdrawal.reference}\n` +
            `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
            `✅ Account reactivated and withdrawal completed.`
          );
        }
      }

      await sendTelegramNotification(
        `✅ Flutterwave Deposit Confirmed!\n\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
        `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
        `FLW Ref: ${flwData.data?.flw_ref}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      await sendSlackMessage(
        process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
        `:white_check_mark: *Flutterwave Deposit Confirmed*\n` +
        `User: ${user.username}\n` +
        `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
        `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
        `Channel: ${flwData.data?.payment_type}\n` +
        `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
      );

      res.json({
        success: true,
        message: 'Deposit verified and balance credited successfully',
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
        currency: transaction.currency || user.currency || 'USD',
        newBalance: transaction.status === 'completed' ? user.balance : null
      });
    } catch (error) {
      console.error('FLW deposit status error:', error);
      res.status(500).json({ error: 'Failed to get deposit status' });
    }
  }
);

// Flutterwave webhook (Resilient multi-header & hash matching)
router.post('/flw-webhook', async (req, res) => {
  try {
    const signature = (req.headers['verif-hash'] || req.headers['verif_hash'] || req.headers['x-flutterwave-signature'] || '').trim();
    const secretHash = (process.env.FLUTTERWAVE_WEBHOOK_HASH || process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_HASH || '').trim();

    if (secretHash && signature && signature !== secretHash) {
      console.warn('⚠️ Unauthorized Flutterwave webhook attempt. Invalid verif-hash.');
      return res.status(401).send('Unauthorized');
    }

    const payload = req.body;
    console.log('✅ Flutterwave webhook payload received:', payload?.event);

    if (payload.event !== 'charge.completed') {
      return res.status(200).send('Event ignored');
    }

    const data = payload.data;
    if (!data) {
      return res.status(400).send('Missing payload data');
    }

    const { id, tx_ref, status, amount, currency } = data;

    // Failsafe check: Re-verify with Flutterwave verify endpoint directly
    const verifyRes = await axios.get(
      `${FLW_BASE_URL}/transactions/${id}/verify`,
      {
        headers: { Authorization: `Bearer ${getFlwSecretKey()}` },
        timeout: 15000
      }
    );

    const flwData = verifyRes.data;
    if (!flwData || flwData.status !== 'success') {
      return res.status(400).send('Re-verification failed');
    }

    const paymentStatus = flwData.data?.status;
    if (paymentStatus !== 'successful') {
      return res.status(400).send(`Payment status not successful: ${paymentStatus}`);
    }

    const transaction = await Transaction.findOne({ reference: tx_ref });
    if (!transaction) {
      console.error(`❌ Transaction not found in DB for tx_ref: ${tx_ref}`);
      return res.status(200).send('Transaction not found, but webhook acknowledged');
    }

    if (transaction.status === 'completed') {
      return res.status(200).send('Already completed');
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(200).send('User not found, but webhook acknowledged');
    }

    // Credit home currency amount
    user.balance += transaction.amount;
    await user.save();

    try {
      await recordAffiliateDeposit(user, transaction.amount);
    } catch (err) {
      console.error('Affiliate deposit tracking failed in webhook:', err.message);
    }

    transaction.status = 'completed';
    transaction.balanceAfter = user.balance;
    transaction.processedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      flwTransactionId: id,
      flwVerifyData: {
        status: paymentStatus,
        channel: flwData.data?.payment_type,
        flwRef: flwData.data?.flw_ref,
        viaWebhook: true
      }
    };
    await transaction.save();

    const userCurrency = user.currency || transaction.currency || 'USD';

    // Check if activation fee for withdrawal
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

        await sendSlackMessage(
          process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
          `:white_check_mark: *Withdrawal Automatically Approved (Flutterwave Webhook)*\n` +
          `User: ${user.username}\n` +
          `Withdrawal Amount: ${formatCurrency(withdrawal.amount, userCurrency)}\n` +
          `Activation Fee: ${formatCurrency(transaction.amount, userCurrency)}\n` +
          `Transaction ID: ${withdrawal.reference}\n` +
          `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
          `✅ Account reactivated and withdrawal completed.`
        );
      }
    }

    await sendTelegramNotification(
      `✅ Flutterwave Deposit Confirmed (Webhook)!\n\n` +
      `User: ${user.username}\n` +
      `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
      `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
      `FLW Ref: ${flwData.data?.flw_ref}\n` +
      `Time: ${new Date().toLocaleString()}`
    );

    await sendSlackMessage(
      process.env.SLACK_WEBHOOK_DEPOSIT_REQUEST,
      `:white_check_mark: *Flutterwave Deposit Confirmed (Webhook)*\n` +
      `User: ${user.username}\n` +
      `Amount: ${formatCurrency(transaction.amount, userCurrency)}\n` +
      `New Balance: ${formatCurrency(user.balance, userCurrency)}\n` +
      `Channel: ${flwData.data?.payment_type}\n` +
      `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
    );

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('FLW webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;