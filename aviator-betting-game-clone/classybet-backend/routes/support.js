const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const SupportConversation = require('../models/SupportConversation');
const { postSlackThread, sendSlackMessage, verifySlackSignature } = require('../utils/slack');

// Helper: extract user from JWT if present
function extractUserFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    return decoded;
  } catch { return null; }
}

const SYSTEM_PROMPT = `You are the premium, highly professional customer support AI for jetbetaviator.com (JetBet).
You assist users with account, game, deposit, and withdrawal inquiries.

Here is the key context you must use to answer queries:

1. DEPOSITS:
- Deposits are crypto-only: USDT (Tether) on Tron (TRC20), BNB Smart Chain (BEP20), or Ethereum (ERC20).
- Mobile money and card deposits are no longer supported.
- The user enters their deposit amount in their local currency and the site shows the approximate USDT equivalent to send. Minimums: KES 1,300, NGN 16,100, GHS 155, ZAR 185, USD 10.
- Flow: user opens Deposit, picks a network (TRC20 recommended for lowest fees), sends USDT to the displayed wallet address, optionally pastes their transaction hash, and clicks "I've sent funds". Deposits are verified manually and typically credited within 5-30 minutes.
- If a deposit doesn't reflect: ask for the transaction hash (txid) AND the network used so an admin can trace it on the blockchain explorer.
- We accept USDT only — not BTC, ETH, or other coins. Users holding other coins must swap to USDT first (e.g. on Binance, Bybit, or OKX).
- Users can buy USDT with local currency or mobile money on Binance P2P, Bybit, OKX, or Yellow Card.
- Warn users to always send on the exact network selected — sending on the wrong network can permanently lose funds.
- If they continue to complain or insist, inform them that a supervisor is manually verifying the transaction on-chain.

2. WITHDRAWALS:
- Standard minimums: KES 500, NGN 10,000, GHS 900, ZAR 200, USD 5.
- Standard processing timeline: 24 to 48 hours.
- Compliance checks: All withdrawals undergo AML audits.
- Withdrawal holds/suspensions: If a user's withdrawal is restricted, suspended, or locked (or there is a "fee" flag), instruct them to go to "Profile > Transactions" (NOT Profile > Withdrawals), click on the pending transaction, and click "Resolve Issue" / "Activate Now".
- 20% activation fee: Explain that a 20% compliance fee must be paid via Flutterwave due to AML or irregular betting checks. Professionally explain that it CANNOT be deducted from their balance because the balance is locked in an escrow ledger that cannot be altered before clearance.

3. REGISTRATION & LOGIN:
- Registration: Click "Register" at top right, enter phone, password, confirm, and verify with OTP SMS.
- OTP/Login issues: SMS OTPs can take 1-2 minutes depending on mobile carrier network congestion.

4. AVIATOR GAME INSTRUCTIONS:
- How to play: Place one or two bets before takeoff. Watch the plane fly and multiplier increase. Click cash out before the plane crashes to win.
- Features: Auto-Bet and Auto-Cashout are supported.
- Provably Fair: The game runs on a mathematically secure Provably Fair RNG system checkable by players.

5. ESCALATION:
- If the user asks for a human, agent, or manager, or wants to talk to a person, do not answer directly. The router will automatically escalate them.

Keep your tone helpful, extremely professional, and casino-appropriate. Always write concise responses.`;

// Stateful keyword responder fallback
function findKeywordResponse(message, conversationHistory) {
  const lowercaseMsg = message.toLowerCase();
  const userMessages = conversationHistory.filter(m => m.from === 'user');

  const depositKeywords = ['deposit', 'pay', 'fund', 'recharge', 'dep', 'load', 'sent money', 'usdt', 'crypto', 'tether'];
  const withdrawalKeywords = ['withdraw', 'withdrawal', 'cashout', 'cash out', 'payout', 'pay out', 'withdrew'];
  const holdOrSuspendedKeywords = ['hold', 'restricted', 'suspended', 'fee', 'locked'];

  const isHoldOrSuspendedInquiry = holdOrSuspendedKeywords.some(kw => lowercaseMsg.includes(kw));

  // Determine active topic and counts based on user history sequence
  let depositCount = 0;
  let withdrawalCount = 0;
  let currentTopic = null;

  for (const msg of userMessages) {
    const txt = msg.text.toLowerCase();
    const matchesDep = depositKeywords.some(kw => txt.includes(kw));
    const matchesWith = withdrawalKeywords.some(kw => txt.includes(kw));

    if (matchesDep) {
      currentTopic = 'deposit';
    } else if (matchesWith) {
      currentTopic = 'withdrawal';
    }

    if (currentTopic === 'deposit') {
      depositCount++;
    } else if (currentTopic === 'withdrawal') {
      withdrawalCount++;
    }
  }

  // 1. Withdrawal holds/restrictions/fees check (highest priority for withdrawals)
  if (isHoldOrSuspendedInquiry || (currentTopic === 'withdrawal' && lowercaseMsg.includes('fee'))) {
    return "Your withdrawal is currently locked/restricted due to standard compliance audits (irregular betting patterns or AML verification checks). To resolve this, please go to **Profile > Transactions**, click on your pending withdrawal, and select **Resolve Issue** / **Activate Now** to pay the required **20% processing/activation fee** via Flutterwave. Note that this fee cannot be deducted from your account balance as the funds are locked in an escrow ledger that cannot be modified before compliance clearance.";
  }

  // 2. Crypto deposit specifics — checked BEFORE the generic deposit replies.
  //    Order matters: most specific topics first. "Not credited" checks are
  //    guarded so withdrawal complaints don't hit them.
  const mentionsWithdraw = withdrawalKeywords.some(kw => lowercaseMsg.includes(kw));

  if (['wrong network', 'wrong address', 'wrong chain', 'wrong wallet', 'sent to wrong', 'different network', 'other network'].some(kw => lowercaseMsg.includes(kw))) {
    return "Transfers sent on the wrong network or to the wrong address are usually irreversible and cannot be recovered. If you believe this happened, please provide your transaction hash (txid), the network you actually used, and the network shown on the deposit page so our team can check whether anything can be done. Always double-check the network before sending.";
  }

  if (['txid', 'transaction hash', 'tx hash', 'hash'].some(kw => lowercaseMsg.includes(kw))) {
    return "A transaction hash (txid) is the unique ID your wallet or exchange assigns to your USDT transfer after you send it. You can find it in your wallet's transaction history or on the exchange's withdrawal record. Paste it into the deposit modal (optional) or send it here with the network you used so we can verify your deposit faster.";
  }

  if (['which network', 'best network', 'what network', 'choose network', 'trc20', 'bep20', 'erc20', 'tron', 'bsc', 'network fee', 'gas fee'].some(kw => lowercaseMsg.includes(kw))) {
    return "We accept USDT on three networks: **Tron (TRC20)** — recommended, lowest fee (~1 USDT); **BNB Smart Chain (BEP20)** — low fee (~0.3 USDT); and **Ethereum (ERC20)** — higher fees (~2-10 USDT). Select the same network on our deposit page and in your wallet. Most users choose TRC20.";
  }

  if (['bitcoin', 'btc', 'bnb', 'solana', 'doge', 'litecoin', 'xrp', 'ripple', 'cardano', 'shiba', 'usdc', 'busd', 'other coin', 'different coin', 'another coin', 'other crypto'].some(kw => lowercaseMsg.includes(kw))) {
    return "We accept **USDT (Tether) only** — not BTC, ETH, or other coins. If you hold a different cryptocurrency, please swap it to USDT on an exchange (Binance, Bybit, OKX) first, then deposit the USDT on TRC20, BEP20, or ERC20.";
  }

  if (['buy usdt', 'buy crypto', 'get usdt', 'purchase usdt', 'where to buy', 'how to buy', 'acquire usdt'].some(kw => lowercaseMsg.includes(kw))) {
    return "You can buy USDT with your local currency or mobile money on **Binance P2P**, **Bybit**, **OKX**, or **Yellow Card**. Once you have USDT, open the Deposit section, enter your amount, pick a network (TRC20 recommended), and send to the address shown.";
  }

  if (['wallet address', 'deposit address', 'address to send', 'where do i send', 'where to send', 'qr code', 'qrcode', 'scan the'].some(kw => lowercaseMsg.includes(kw))) {
    return "The deposit address and QR code are shown inside the deposit modal: open **Deposit**, enter your amount, and select a network — the USDT address and a scannable QR appear there. Always copy the address directly from the site and verify the first and last characters before sending.";
  }

  if (['minimum deposit', 'min deposit', 'maximum deposit', 'max deposit', 'deposit limit', 'deposit cap', 'smallest deposit'].some(kw => lowercaseMsg.includes(kw))) {
    return "Minimum deposits are KES 1,300, NGN 16,100, GHS 155, ZAR 185, or USD 10 equivalent. You enter the amount in your local currency and the deposit page shows the ≈USDT amount to send. Maximum limits depend on your currency and are displayed under the amount field.";
  }

  if (!mentionsWithdraw && ['not showing', 'not credited', 'not reflected', "hasn't arrived", 'has not arrived', 'did not arrive', "didn't arrive", 'missing deposit', 'not received', 'no balance', 'balance not'].some(kw => lowercaseMsg.includes(kw))) {
    return "Crypto deposits are verified manually and normally credit within 5-30 minutes. If yours has taken longer, please send us your transaction hash (txid) and the network used (TRC20, BEP20, or ERC20) so we can trace it on the blockchain immediately.";
  }

  if (!mentionsWithdraw && ['i sent', 'i have sent', 'i just sent', 'sent the usdt', 'sent usdt', 'i deposited', 'i have deposited', 'i paid', 'payment done', 'done the transfer', 'made the deposit', 'sent the money'].some(kw => lowercaseMsg.includes(kw))) {
    return "Thanks! Your deposit is **pending verification** — our team confirms USDT transfers manually, usually within 5-30 minutes. If it takes longer, send us your transaction hash (txid) and the network you used so we can trace it faster.";
  }

  if (['crypto', 'usdt', 'tether', 'blockchain'].some(kw => lowercaseMsg.includes(kw))) {
    return "Deposits are USDT-only (Tether) on TRC20, BEP20, or ERC20 — mobile money and cards are no longer supported. Open **Deposit**, enter the amount in your local currency, pick a network (TRC20 has the lowest fees), send USDT to the address shown, and optionally paste your txid. We credit deposits after manual verification, typically within 5-30 minutes.";
  }

  // 3. Deposit logic
  if (currentTopic === 'deposit') {
    if (depositCount === 1) {
      return "To make a deposit, open the Deposit section, enter your amount in your local currency, choose a USDT network (TRC20 recommended for the lowest fees), and send USDT to the address shown. Deposits are crypto-only — mobile money and card deposits are no longer supported. Minimum deposit is KES 1,300, NGN 16,100, GHS 155, ZAR 185, or USD 10. Deposits are verified manually and typically credited within 5-30 minutes.";
    } else if (depositCount === 2) {
      return "If you have sent USDT but your balance hasn't updated, please reply with your transaction hash (txid) and the network you used (TRC20, BEP20, or ERC20) so we can trace it on the blockchain immediately.";
    } else {
      return "I have escalated your deposit issue to our billing supervisors. They are manually verifying the transaction on-chain right now, and we will update you here as soon as it is resolved.";
    }
  }

  // 3. Normal withdrawal logic
  if (currentTopic === 'withdrawal') {
    if (withdrawalCount === 1) {
      return "Standard withdrawals require a minimum amount of KES 500, NGN 10,000, GHS 900, ZAR 200, or USD 5. The standard processing timeline is 24 to 48 hours for auditing and clearance.";
    } else {
      return "All withdrawal requests undergo standard compliance checks to ensure account security. Please go to **Profile > Transactions** and check the status badge on your pending transaction for real-time updates.";
    }
  }

  // 4. Registration
  if (['register', 'sign up', 'create account', 'join'].some(kw => lowercaseMsg.includes(kw))) {
    return "To sign up, click the yellow 'Register' button at the top right of the homepage. Fill in your phone number, set a password, enter a promo code if you have one, check the terms and conditions, and submit. An OTP will be sent to confirm your registration.";
  }

  // 5. Login / OTP
  if (['login', 'sign in', 'password', 'reset', 'otp', 'forgot'].some(kw => lowercaseMsg.includes(kw))) {
    return "If you are having trouble logging in or haven't received your OTP, please request a password reset via the Login modal. OTP SMS messages are sent immediately but can take 1-2 minutes depending on your mobile network carrier. Ensure you have network reception.";
  }

  // 6. Aviator rules
  if (['aviator', 'play', 'game', 'how to play', 'rules', 'multiplier', 'takeoff', 'crash'].some(kw => lowercaseMsg.includes(kw))) {
    return "In Aviator, place one or two bets before the plane takes off. As the plane climbs, the multiplier increases. Cash out at any time before the plane crashes to win your bet multiplied by that multiplier. You can also use Auto-Bet and Auto-Cashout features. The game uses a Provably Fair RNG algorithm, meaning each round's outcome is mathematically secure and transparent.";
  }

  // Default response
  return "Hello! I am JetBet's automated support assistant. How can I help you today? You can ask about deposits, withdrawals, registration, or how to play Aviator. If you wish to speak with an agent, just reply with 'agent' or 'human'.";
}

// POST /chat
router.post('/chat', async (req, res) => {
  try {
    const { message, page, url, meta, conversationId, sessionId } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const tokenUser = extractUserFromToken(req);
    const userId = tokenUser ? tokenUser.userId : null;
    const username = meta?.username || tokenUser?.username || 'Guest';
    const sid = sessionId || `anon-${Date.now()}`;

    // Find or create conversation
    let conversation = null;
    if (conversationId) {
      conversation = await SupportConversation.findById(conversationId);
    }
    if (!conversation && userId) {
      conversation = await SupportConversation.findOne({ userId, status: 'open' });
    }
    if (!conversation) {
      conversation = await SupportConversation.findOne({ sessionId: sid, status: 'open' });
    }
    if (!conversation) {
      conversation = new SupportConversation({
        userId,
        username,
        sessionId: sid,
        messages: [],
        status: 'open'
      });
    }

    // Append user message
    const now = new Date();
    conversation.messages.push({ from: 'user', text: message.trim(), createdAt: now });

    // Build Slack text
    const metaLines = [];
    if (username && username !== 'Guest') metaLines.push(`*User:* ${username}`);
    if (meta?.email) metaLines.push(`*Email:* ${meta.email}`);
    if (meta?.phone) metaLines.push(`*Phone:* ${meta.phone}`);
    if (page) metaLines.push(`*Page:* ${page}`);
    const header = metaLines.length ? metaLines.join(' | ') + '\n' : '';
    
    // Slack Threading logic
    const channel = process.env.SLACK_SUPPORT_CHANNEL_ID;
    if (channel) {
      if (!conversation.slackThreadTs) {
        // Post first message to start thread
        const slackText = `:speech_balloon: *New Support Conversation*\n${header}\n${message.trim()}`;
        const ts = await postSlackThread(channel, slackText);
        if (ts) {
          conversation.slackThreadTs = ts;
          conversation.slackChannel = channel;
        }
      } else {
        // Post reply in existing thread
        await postSlackThread(channel, message.trim(), conversation.slackThreadTs);
      }
    } else {
      // Webhook fallback if channel configuration is missing
      const slackText = `:speech_balloon: *Support Message (No Thread)*\n${header}\n${message.trim()}`;
      await sendSlackMessage(process.env.SLACK_WEBHOOK_SUPPORT || process.env.SLACK_WEBHOOK_PROFILE, slackText);
    }

    // Escalation Keyword check
    const lowercaseMsg = message.toLowerCase();
    const isEscalationMsg = ['human', 'agent', 'talk to person', 'talk to human', 'real person', 'chat with person'].some(kw => lowercaseMsg.includes(kw));

    if (isEscalationMsg) {
      conversation.isEscalated = true;
      conversation.agentHandover = true;
      
      const escalationNotice = "I have escalated this conversation to a live agent. An admin will reply shortly in this chat.";
      conversation.messages.push({
        from: 'agent',
        text: escalationNotice,
        createdAt: new Date()
      });

      await conversation.save();

      // Post escalation alert to Slack thread
      if (conversation.slackThreadTs && conversation.slackChannel) {
        await postSlackThread(conversation.slackChannel, `:warning: *Conversation Escalated to Live Agent*`, conversation.slackThreadTs);
      }

      return res.json({
        success: true,
        conversationId: conversation._id,
        sessionId: conversation.sessionId,
        messages: conversation.messages
      });
    }

    // Mute Check: Skip bot response if conversation is escalated/handover
    if (conversation.isEscalated || conversation.agentHandover) {
      await conversation.save();
      return res.json({
        success: true,
        conversationId: conversation._id,
        sessionId: conversation.sessionId,
        messages: conversation.messages
      });
    }

    // Generate Response (OpenAI or local fallback)
    let botResponse = '';
    if (process.env.OPENAI_API_KEY) {
      try {
        const lastMessages = conversation.messages.slice(-6);
        const formattedMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...lastMessages.map(m => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        ];

        const aiRes = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: formattedMessages,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            timeout: 10000
          }
        );

        botResponse = aiRes.data.choices[0].message.content.trim();
      } catch (err) {
        console.error('OpenAI generation failed, falling back to keywords:', err.message);
        botResponse = findKeywordResponse(message.trim(), conversation.messages);
      }
    } else {
      botResponse = findKeywordResponse(message.trim(), conversation.messages);
    }

    // Append agent response
    conversation.messages.push({
      from: 'agent',
      text: botResponse,
      createdAt: new Date()
    });

    await conversation.save();

    // Post agent reply to Slack thread
    if (conversation.slackThreadTs && conversation.slackChannel) {
      await postSlackThread(conversation.slackChannel, `*Bot Assistant:* ${botResponse}`, conversation.slackThreadTs);
    }

    res.json({
      success: true,
      conversationId: conversation._id,
      sessionId: conversation.sessionId,
      messages: conversation.messages
    });

  } catch (error) {
    console.error('Support chat route error:', error);
    res.status(500).json({ error: 'Failed to process support message' });
  }
});

// GET /conversation/current
router.get('/conversation/current', async (req, res) => {
  try {
    const tokenUser = extractUserFromToken(req);
    const sessionId = req.query.sessionId;

    let conversation = null;
    if (tokenUser?.userId) {
      conversation = await SupportConversation.findOne(
        { userId: tokenUser.userId, status: 'open' }
      ).sort({ updatedAt: -1 });
    }
    if (!conversation && sessionId) {
      conversation = await SupportConversation.findOne(
        { sessionId, status: 'open' }
      ).sort({ updatedAt: -1 });
    }

    if (!conversation) {
      return res.json({ conversationId: null, messages: [] });
    }

    res.json({
      conversationId: conversation._id,
      sessionId: conversation.sessionId,
      messages: conversation.messages
    });
  } catch (error) {
    console.error('Fetch conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// GET /conversation/:id/updates
router.get('/conversation/:id/updates', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const newMessages = conversation.messages.filter(m => new Date(m.createdAt) > since);
    res.json({ messages: newMessages });
  } catch (error) {
    console.error('Poll updates error:', error);
    res.status(500).json({ error: 'Failed to poll updates' });
  }
});

// POST /slack-events
router.post('/slack-events', async (req, res) => {
  try {
    // URL verification challenge
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    // Verify signature
    if (!verifySlackSignature(req)) {
      console.warn('Slack signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    if (!event) return res.sendStatus(200);

    // Ignore bot messages
    if (event.bot_id || event.subtype === 'bot_message') {
      return res.sendStatus(200);
    }

    // Threaded reply inside support channel
    if (event.thread_ts && event.channel) {
      const conversation = await SupportConversation.findOne({
        slackThreadTs: event.thread_ts,
        slackChannel: event.channel
      });

      if (conversation) {
        conversation.messages.push({
          from: 'agent',
          text: event.text,
          createdAt: new Date()
        });
        
        // Escalate and mark handover when human agent speaks
        conversation.isEscalated = true;
        conversation.agentHandover = true;
        await conversation.save();
        console.log(`💬 Agent reply from Slack saved for conversation ${conversation._id} (agentHandover=true)`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Slack events error:', error);
    res.sendStatus(200); // Always respond 200 so Slack doesn't retry
  }
});

// PATCH /conversation/:id/mute
router.patch('/conversation/:id/mute', async (req, res) => {
  try {
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    conversation.isEscalated = true;
    conversation.agentHandover = true;
    await conversation.save();
    res.json({ success: true, isEscalated: true, agentHandover: true });
  } catch (error) {
    console.error('Mute conversation error:', error);
    res.status(500).json({ error: 'Failed to mute conversation' });
  }
});

module.exports = router;
module.exports.findKeywordResponse = findKeywordResponse;

