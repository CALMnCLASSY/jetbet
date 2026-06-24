const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: { type: String, enum: ['user', 'agent'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const supportConversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: 'Guest' },
    sessionId: { type: String, required: true },
    messages: [messageSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    isEscalated: { type: Boolean, default: false },
    agentHandover: { type: Boolean, default: false },  // kept for backward compatibility
    slackThreadTs: { type: String, default: null },
    slackChannel: { type: String, default: null }
}, { timestamps: true });

// Sparse and compound indexes for fast lookups
supportConversationSchema.index({ userId: 1, status: 1 }, { sparse: true });
supportConversationSchema.index({ sessionId: 1, status: 1 }, { sparse: true });
supportConversationSchema.index({ slackThreadTs: 1, slackChannel: 1 }, { sparse: true });

module.exports = mongoose.model('SupportConversation', supportConversationSchema);
