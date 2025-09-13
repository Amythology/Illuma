const validator = require('validator');

const sanitizeComment = (text) => {
    return validator.escape(text).trim();
};

const validateComment = (text) => {
    if (!text || typeof text !== 'string') {
        return { isValid: false, message: 'Comment text is required' };
    }

    const cleanText = text.trim();
    
    if (cleanText.length < 10) {
        return { isValid: false, message: 'Comment must be at least 10 characters long' };
    }
    
    if (cleanText.length > 500) {
        return { isValid: false, message: 'Comment cannot exceed 500 characters' };
    }

    return { isValid: true, text: cleanText };
};

module.exports = { sanitizeComment, validateComment };
