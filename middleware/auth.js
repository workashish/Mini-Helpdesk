const jwt = require('jsonwebtoken');
const Database = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'helpdesk-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Access token is required"
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = new Database();
    await db.initialize();
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token"
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Invalid or expired token"
      }
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions"
        }
      });
    }

    next();
  };
};

const handleIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: {
        code: "FIELD_REQUIRED",
        field: "idempotency-key",
        message: "Idempotency-Key header is required for POST requests"
      }
    });
  }

  if (req.user) {
    const db = new Database();
    await db.initialize();
    
    const existing = await db.get(
      'SELECT response FROM idempotency_keys WHERE key = ? AND user_id = ?',
      [idempotencyKey, req.user.id]
    );

    if (existing) {
      const response = JSON.parse(existing.response);
      return res.status(response.status).json(response.data);
    }

    // Store the idempotency key for this request
    req.idempotencyKey = idempotencyKey;
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  handleIdempotency,
  JWT_SECRET
};