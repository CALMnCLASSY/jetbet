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
- Supported currencies & minimums: KES 350, NGN 6,500, GHS 600, ZAR 125, USD 3.
- Processed via mobile money, card, or crypto.
- If a deposit fails or doesn't reflect: Reassure the user and request their Transaction Reference, Receipt Number, or payment phone number so we can trace it.
- If they continue to complain or insist, inform them that a supervisor is manually investigating the payment gateway logs.

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

  const depositKeywords = ['deposit', 'pay', 'fund', 'recharge', 'dep', 'load', 'sent money'];
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

  // 2. Deposit logic
  if (currentTopic === 'deposit') {
    if (depositCount === 1) {
      return "To make a deposit, please navigate to the Deposit tab on the platform. We support multiple home currency options: Minimum deposit is KES 350, NGN 6,500, GHS 600, ZAR 125, or USD 3. Follow the prompts to complete payment securely using mobile money, card, or crypto.";
    } else if (depositCount === 2) {
      return "If your payment was processed but hasn't updated on your account, please reply with your Transaction Reference, Receipt Number, or payment phone number. We will use this information to trace the transaction immediately.";
    } else {
      return "I have escalated your deposit issue to our billing supervisors. They are manually investigating the payment gateway logs right now, and we will update you here as soon as it is resolved.";
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

