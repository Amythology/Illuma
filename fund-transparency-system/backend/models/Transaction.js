const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromDepartment: {
    type: String,
    required: true
  },
  toDepartment: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Education', 'Healthcare', 'Infrastructure', 'Defense', 'Agriculture', 'Technology', 'Social Welfare'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'flagged', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvals: {
    type: Number,
    default: 0
  },
  flags: {
    type: Number,
    default: 0
  },
  fiscalYear: {
    type: String,
    required: true,
    default: '2025-26'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
