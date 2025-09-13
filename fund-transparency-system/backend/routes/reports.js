const express = require('express');
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Submit a report (flag or approve)
router.post('/', auth, async (req, res) => {
  try {
    const { transactionId, type, reason, description } = req.body;

    if (!transactionId || !type) {
      return res.status(400).json({ success: false, message: 'Transaction ID and type are required.' });
    }

    if (type === 'flag' && !reason) {
      return res.status(400).json({ success: false, message: 'Reason is required for flagging.' });
    }

    // Check if transaction exists
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Check if user already reported this transaction
    const existingReport = await Report.findOne({
      transactionId,
      reportedBy: req.user._id
    });

    if (existingReport) {
      return res.status(400).json({ success: false, message: 'You have already reported this transaction.' });
    }

    const report = new Report({
      transactionId,
      reportedBy: req.user._id,
      type,
      reason,
      description
    });

    await report.save();

    // Update transaction counters
    if (type === 'flag') {
      transaction.flags += 1;
      if (transaction.flags >= 5) { // Auto-flag if 5+ reports
        transaction.status = 'flagged';
      }
    } else if (type === 'approve') {
      transaction.approvals += 1;
      if (transaction.approvals >= 10 && transaction.flags < 3) { // Auto-approve if 10+ approvals and <3 flags
        transaction.status = 'approved';
      }
    }

    await transaction.save();

    res.status(201).json({
      success: true,
      message: `Transaction ${type}ed successfully`,
      data: report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get reports for a transaction
router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const reports = await Report.find({ transactionId: req.params.transactionId })
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
