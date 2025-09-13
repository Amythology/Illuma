const express = require('express');
const Transaction = require('../models/Transaction');
const { auth, govtOnly } = require('../middleware/auth');
const Comment = require('../models/Comment');
const { authenticateToken } = require('../middleware/auth');
const { validateComment, sanitizeComment } = require('../utils/validation');


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

    else if(amount>1000000000){
      return res.status(400).json({ success: false, message: 'This amount exceeding the budget! ' });
      alert("This amount exceeding the budget! ");
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

// GET /api/transactions/:id/comments - Fetch comments for a transaction
router.get('/:id/comments', async (req, res) => {
    try {
        const { id: transactionId } = req.params;
        const { page = 1, limit = 20, sort = 'newest' } = req.query;

        // Validate transaction exists
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Build sort criteria
        let sortCriteria = { createdAt: -1 }; // newest first
        if (sort === 'oldest') {
            sortCriteria = { createdAt: 1 };
        }

        // Fetch comments with pagination
        const comments = await Comment.find({
            transactionId,
            isHidden: false
        })
        .sort(sortCriteria)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name email')
        .lean();

        // Get total count for pagination
        const total = await Comment.countDocuments({
            transactionId,
            isHidden: false
        });

        res.json({
            success: true,
            data: comments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalComments: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
});

// POST /api/transactions/:id/comments - Add a new comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id: transactionId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;
        const userName = req.user.name;

        // Validate and sanitize input
        const validation = validateComment(text);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        const sanitizedText = sanitizeComment(validation.text);

        // Validate transaction exists
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Rate limiting check - prevent spam
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const recentComments = await Comment.countDocuments({
            userId,
            createdAt: { $gte: oneMinuteAgo }
        });

        if (recentComments >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Rate limit exceeded. Please wait before posting again.'
            });
        }

        // Create comment
        const newComment = new Comment({
            transactionId,
            userId,
            userName,
            text: sanitizedText
        });

        await newComment.save();

        // Return the created comment
        const createdComment = await Comment.findById(newComment._id)
            .populate('userId', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            data: createdComment,
            message: 'Comment posted successfully'
        });

    } catch (error) {
        console.error('Error posting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to post comment'
        });
    }
});

// DELETE /api/transactions/:transactionId/comments/:commentId - Delete comment
router.delete('/:transactionId/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { transactionId, commentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Find comment
        const comment = await Comment.findOne({
            _id: commentId,
            transactionId
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check permissions (user can delete own comments, admins can delete any)
        if (comment.userId.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this comment'
            });
        }

        // Soft delete by hiding instead of removing
        comment.isHidden = true;
        await comment.save();

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
});


module.exports = router;
