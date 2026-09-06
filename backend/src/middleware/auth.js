const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        console.log('[ERROR] Auth Error: No token provided');
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(`[SUCCESS] Auth Success: User ${decoded.id} (${decoded.role})`);
        next();
    } catch (err) {
        console.error('[ERROR] Token Verification Failed:', err.message);
        const message = err.name === 'TokenExpiredError' ? "Session Expired. Please login again." : "Invalid Token";
        res.status(401).json({ error: message });
    }
};
