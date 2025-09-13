const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['flag', 'approve'],
    required: true
  },
  reason: {
    type: String,
    required: function() { return this.type === 'flag'; }
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
