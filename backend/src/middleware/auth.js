const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_portal_jwt_secret_vivek_2026';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({ error: 'Access token missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }
      req.user = decodedUser;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing' });
  }
}

// Middleware to restrict routes to specific roles
function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' does not have permission for this resource.` 
      });
    }
    
    next();
  };
}

module.exports = {
  authenticateJWT,
  restrictTo,
  JWT_SECRET
};
