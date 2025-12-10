// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // token can come either from custom header or standard Authorization header
  const token =
    req.header('x-auth-token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Make sure JWT_SECRET in .env matches what you used in authController.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload to request (e.g. { id, role })
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
