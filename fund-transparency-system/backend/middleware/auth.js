const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is not valid.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid.' });
  }
};

const govtOnly = (req, res, next) => {
  if (req.user.role !== 'govt_official') {
    return res.status(403).json({ success: false, message: 'Access denied. Government officials only.' });
  }
  next();
};

module.exports = { auth, govtOnly };
