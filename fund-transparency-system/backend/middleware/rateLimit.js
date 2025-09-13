const rateLimit = require('express-rate-limit');

const commentRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 comments per windowMs
    message: {
        success: false,
        message: 'Too many comments from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { commentRateLimit };
