const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Database = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/agent only)
router.get('/', authenticateToken, requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const db = new Database();
    await db.initialize();

    const users = await db.all(`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY name ASC
    `);

    res.json(users);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch users"
      }
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = new Database();
    await db.initialize();

    const user = await db.get(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = ?
    `, [req.user.id]);

    res.json(user);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch profile"
      }
    });
  }
});

// Get specific user by ID (admin/agent only)
router.get('/:id', authenticateToken, requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    const user = await db.get(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch user"
      }
    });
  }
});

// Update current user profile
router.put('/me', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail()
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

    const { name, email } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
      if (existingUser) {
        return res.status(409).json({
          error: {
            code: "EMAIL_EXISTS",
            field: "email",
            message: "Email already exists"
          }
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_UPDATES",
          message: "No valid fields to update"
        }
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    await db.run(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Get updated user
    const updatedUser = await db.get(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = ?
    `, [req.user.id]);

    res.json(updatedUser);

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update profile"
      }
    });
  }
});

// Update user by ID (admin only)
router.put('/:id', [
  authenticateToken,
  requireRole(['admin']),
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
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

    const userId = parseInt(req.params.id);
    const { name, email, role } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailUser = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (emailUser) {
        return res.status(409).json({
          error: {
            code: "EMAIL_EXISTS",
            field: "email",
            message: "Email already exists"
          }
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_UPDATES",
          message: "No valid fields to update"
        }
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await db.run(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Get updated user
    const updatedUser = await db.get(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    res.json(updatedUser);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update user"
      }
    });
  }
});

// Delete user by ID (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    // Check if user exists
    const existingUser = await db.get('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        error: {
          code: "CANNOT_DELETE_SELF",
          message: "Cannot delete your own account"
        }
      });
    }

    // Check if user has any tickets assigned
    const assignedTickets = await db.get('SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?', [userId]);
    const createdTickets = await db.get('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [userId]);

    if (assignedTickets.count > 0 || createdTickets.count > 0) {
      return res.status(409).json({
        error: {
          code: "USER_HAS_TICKETS",
          message: "Cannot delete user with existing tickets. Please reassign or delete tickets first."
        }
      });
    }

    // Delete user
    await db.run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete user"
      }
    });
  }
});

module.exports = router;