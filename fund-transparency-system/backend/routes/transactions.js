const express = require('express');
const Transaction = require('../models/Transaction');
const { auth, govtOnly } = require('../middleware/auth');

const router = express.Router();

// Get all transactions (public access)
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 50, page = 1 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name department')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('createdBy', 'name department');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create transaction (govt officials only)
router.post('/', auth, govtOnly, async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      fromDepartment,
      toDepartment,
      category,
      fiscalYear
    } = req.body;

    if (!title || !description || !amount || !fromDepartment || !toDepartment || !category) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const transaction = new Transaction({
      title,
      description,
      amount,
      fromDepartment,
      toDepartment,
      category,
      fiscalYear: fiscalYear || '2025-26',
      createdBy: req.user._id
    });

    await transaction.save();
    await transaction.populate('createdBy', 'name department');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const totalTransactions = await Transaction.countDocuments();
    const totalAmount = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const statusCounts = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const categoryAmounts = await Transaction.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalAmount: totalAmount[0]?.total || 0,
        statusBreakdown: statusCounts,
        categoryBreakdown: categoryAmounts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
