const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Database = require('../database/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1 }),
  body('role').optional().isIn(['user', 'agent', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { email, password, name, role = 'user' } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "USER_EXISTS",
          field: "email",
          message: "User with this email already exists"
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role]
    );

    // Generate token
    const token = jwt.sign({ userId: result.id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.id,
        email,
        name,
        role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Registration failed"
      }
    });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { email, password } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Find user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password"
        }
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password"
        }
      });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Login failed"
      }
    });
  }
});

// Forgot password endpoint (placeholder for future implementation)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { email } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Check if user exists
    const user = await db.get('SELECT id, email FROM users WHERE email = ?', [email]);
    
    // Always return success for security (don't reveal if email exists)
    res.json({
      message: "If the email address exists in our system, you will receive password reset instructions."
    });

    // TODO: Implement actual email sending logic here
    if (user) {
      console.log(`Password reset requested for user: ${email}`);
      // Generate reset token and send email
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process password reset request"
      }
    });
  }
});

// Reset password endpoint (placeholder for future implementation)
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    // TODO: Implement actual password reset logic here
    res.status(501).json({
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Password reset functionality is not yet implemented"
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to reset password"
      }
    });
  }
});

// Change password endpoint for authenticated users
router.post('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Get current user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: {
          code: "INVALID_PASSWORD",
          field: "currentPassword",
          message: "Current password is incorrect"
        }
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password"
      }
    });
  }
});

module.exports = router;