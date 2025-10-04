const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../database/db');
const { authenticateToken, requireRole, handleIdempotency } = require('../middleware/auth');
const {
  calculateSLADeadline,
  getSLAStatus,
  formatTimeRemaining,
  validatePagination,
  buildSearchQuery,
  logTimeline,
  storeIdempotencyResponse
} = require('../utils/helpers');

const router = express.Router();

// Helper function to normalize status format
const normalizeStatus = (status) => {
  if (!status) return status;
  return status.replace('-', '_');
};

// Get tickets with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, offset, status, priority, assigned_to, search, sla_status } = req.query;
    const { limit: pageLimit, offset: pageOffset } = validatePagination(limit, offset);
    
    const db = new Database();
    await db.initialize();

    let whereConditions = ['1=1'];
    let params = [];

    // Role-based filtering
    if (req.user.role === 'user') {
      whereConditions.push('(t.created_by = ? OR t.assigned_to = ?)');
      params.push(req.user.id, req.user.id);
    }

    // Status filter
    if (status) {
      whereConditions.push('t.status = ?');
      params.push(status);
    }

    // Priority filter
    if (priority) {
      whereConditions.push('t.priority = ?');
      params.push(priority);
    }

    // Assigned to filter
    if (assigned_to) {
      whereConditions.push('t.assigned_to = ?');
      params.push(assigned_to);
    }

    // Search functionality
    if (search) {
      const searchQuery = buildSearchQuery(search);
      whereConditions.push(searchQuery.where.replace('AND ', ''));
      params.push(...searchQuery.params);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get tickets with user info
    const ticketsQuery = `
      SELECT 
        t.*,
        creator.name as created_by_name,
        creator.email as created_by_email,
        assignee.name as assigned_to_name,
        assignee.email as assigned_to_email,
        COUNT(c.id) as comment_count
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN comments c ON t.id = c.ticket_id
      WHERE ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const tickets = await db.all(ticketsQuery, [...params, pageLimit, pageOffset]);

    // Add SLA information
    const enrichedTickets = tickets.map(ticket => ({
      ...ticket,
      sla_status: getSLAStatus(ticket.sla_deadline, ticket.status),
      time_remaining: formatTimeRemaining(ticket.sla_deadline),
      comment_count: parseInt(ticket.comment_count)
    }));

    // Filter by SLA status if requested
    let filteredTickets = enrichedTickets;
    if (sla_status) {
      filteredTickets = enrichedTickets.filter(ticket => ticket.sla_status === sla_status);
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      WHERE ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    const nextOffset = pageOffset + pageLimit < total ? pageOffset + pageLimit : null;

    res.json({
      items: filteredTickets,
      pagination: {
        limit: pageLimit,
        offset: pageOffset,
        total,
        next_offset: nextOffset
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch tickets"
      }
    });
  }
});

// Create ticket
router.post('/', [
  authenticateToken,
  handleIdempotency,
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('category').optional().isIn(['general', 'technical', 'billing', 'account', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { title, description, category = 'general', priority = 'medium' } = req.body;
    
    const db = new Database();
    await db.initialize();

    const slaDeadline = calculateSLADeadline(priority);

    const result = await db.run(
      'INSERT INTO tickets (title, description, category, priority, sla_deadline, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, category, priority, slaDeadline, req.user.id]
    );

    // Log timeline event
    await logTimeline(db, result.id, req.user.id, 'created');

    // Get the created ticket with user info
    const ticket = await db.get(`
      SELECT 
        t.*,
        creator.name as created_by_name,
        creator.email as created_by_email
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ?
    `, [result.id]);

    const response = {
      ...ticket,
      sla_status: getSLAStatus(ticket.sla_deadline, ticket.status),
      time_remaining: formatTimeRemaining(ticket.sla_deadline)
    };

    // Store idempotency response
    await storeIdempotencyResponse(db, req.idempotencyKey, req.user.id, 201, response);

    res.status(201).json(response);

  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket"
      }
    });
  }
});

// Get ticket statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const db = new Database();
    await db.initialize();

    let whereCondition = '1=1';
    let params = [];

    // Role-based filtering
    if (req.user.role === 'user') {
      whereCondition = '(created_by = ? OR assigned_to = ?)';
      params.push(req.user.id, req.user.id);
    }

    // Get stats
    const stats = await db.all(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_priority
      FROM tickets 
      WHERE ${whereCondition}
    `, params);

    res.json(stats[0]);

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch stats"
      }
    });
  }
});

// Get single ticket
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    // Get ticket with user info
    const ticket = await db.get(`
      SELECT 
        t.*,
        creator.name as created_by_name,
        creator.email as created_by_email,
        assignee.name as assigned_to_name,
        assignee.email as assigned_to_email
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `, [ticketId]);

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    // Check access permissions
    if (req.user.role === 'user' && 
        ticket.created_by !== req.user.id && 
        ticket.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Get comments with threading
    const comments = await db.all(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `, [ticketId]);

    // Get timeline
    const timeline = await db.all(`
      SELECT 
        tl.*,
        u.name as user_name
      FROM timeline tl
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE tl.ticket_id = ?
      ORDER BY tl.created_at ASC
    `, [ticketId]);

    res.json({
      ...ticket,
      sla_status: getSLAStatus(ticket.sla_deadline, ticket.status),
      time_remaining: formatTimeRemaining(ticket.sla_deadline),
      comments,
      timeline
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch ticket"
      }
    });
  }
});

// Get ticket comments
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    // Check if ticket exists and user has access
    const ticket = await db.get('SELECT created_by, assigned_to FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    if (req.user.role === 'user' && 
        ticket.created_by !== req.user.id && 
        ticket.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Get comments
    const comments = await db.all(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `, [ticketId]);

    res.json(comments);

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch comments"
      }
    });
  }
});

// Get ticket timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    // Check if ticket exists and user has access
    const ticket = await db.get('SELECT created_by, assigned_to FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    if (req.user.role === 'user' && 
        ticket.created_by !== req.user.id && 
        ticket.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Get timeline
    const timeline = await db.all(`
      SELECT 
        tl.*,
        u.name as user_name
      FROM timeline tl
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE tl.ticket_id = ?
      ORDER BY tl.created_at ASC
    `, [ticketId]);

    res.json(timeline);

  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch timeline"
      }
    });
  }
});

// Update ticket
router.patch('/:id', [
  authenticateToken,
  body('status').optional().isIn(['open', 'in_progress', 'in-progress', 'resolved', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assigned_to').optional().isInt()
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

    const ticketId = parseInt(req.params.id);
    const { status, priority, assigned_to, version } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Get current ticket for optimistic locking
    const currentTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (!currentTicket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    // Check optimistic locking
    if (version && currentTicket.version !== version) {
      return res.status(409).json({
        error: {
          code: "STALE_UPDATE",
          message: "Ticket has been modified by another user"
        }
      });
    }

    // Check permissions
    if (req.user.role === 'user' && 
        currentTicket.created_by !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Build update query
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      const normalizedStatus = normalizeStatus(status);
      updates.push('status = ?');
      params.push(normalizedStatus);
      await logTimeline(db, ticketId, req.user.id, 'status_changed', currentTicket.status, normalizedStatus);
    }
    
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
      
      // Recalculate SLA deadline if priority changes
      const newDeadline = calculateSLADeadline(priority, currentTicket.created_at);
      updates.push('sla_deadline = ?');
      params.push(newDeadline);
      
      await logTimeline(db, ticketId, req.user.id, 'priority_changed', currentTicket.priority, priority);
    }
    
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
      await logTimeline(db, ticketId, req.user.id, 'assigned', currentTicket.assigned_to, assigned_to);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_UPDATES",
          message: "No valid fields to update"
        }
      });
    }

    // Increment version and add updated_at
    updates.push('version = version + 1', 'updated_at = CURRENT_TIMESTAMP');
    params.push(ticketId);

    await db.run(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Return updated ticket
    const updatedTicket = await db.get(`
      SELECT 
        t.*,
        creator.name as created_by_name,
        assignee.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `, [ticketId]);

    res.json({
      ...updatedTicket,
      sla_status: getSLAStatus(updatedTicket.sla_deadline, updatedTicket.status),
      time_remaining: formatTimeRemaining(updatedTicket.sla_deadline)
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update ticket"
      }
    });
  }
});

// Update ticket (PUT - same as PATCH for REST compliance)
router.put('/:id', [
  authenticateToken,
  body('status').optional().isIn(['open', 'in_progress', 'in-progress', 'resolved', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assigned_to').optional().isInt()
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

    const ticketId = parseInt(req.params.id);
    const { status, priority, assigned_to, version } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Get current ticket for optimistic locking
    const currentTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (!currentTicket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    // Check optimistic locking
    if (version && currentTicket.version !== version) {
      return res.status(409).json({
        error: {
          code: "STALE_UPDATE",
          message: "Ticket has been modified by another user"
        }
      });
    }

    // Check permissions
    if (req.user.role === 'user' && 
        currentTicket.created_by !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Build update query
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      const normalizedStatus = normalizeStatus(status);
      updates.push('status = ?');
      params.push(normalizedStatus);
      await logTimeline(db, ticketId, req.user.id, 'status_changed', currentTicket.status, normalizedStatus);
    }
    
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
      
      // Recalculate SLA deadline if priority changes
      const newDeadline = calculateSLADeadline(priority, currentTicket.created_at);
      updates.push('sla_deadline = ?');
      params.push(newDeadline);
      
      await logTimeline(db, ticketId, req.user.id, 'priority_changed', currentTicket.priority, priority);
    }
    
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
      await logTimeline(db, ticketId, req.user.id, 'assigned', currentTicket.assigned_to, assigned_to);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: "NO_UPDATES",
          message: "No valid fields to update"
        }
      });
    }

    // Increment version and add updated_at
    updates.push('version = version + 1', 'updated_at = CURRENT_TIMESTAMP');
    params.push(ticketId);

    await db.run(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Return updated ticket
    const updatedTicket = await db.get(`
      SELECT 
        t.*,
        creator.name as created_by_name,
        assignee.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `, [ticketId]);

    res.json({
      ...updatedTicket,
      sla_status: getSLAStatus(updatedTicket.sla_deadline, updatedTicket.status),
      time_remaining: formatTimeRemaining(updatedTicket.sla_deadline)
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update ticket"
      }
    });
  }
});

// Add comment to ticket
router.post('/:id/comments', [
  authenticateToken,
  handleIdempotency,
  body('content').trim().isLength({ min: 1 }),
  body('parent_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const ticketId = parseInt(req.params.id);
    const { content, parent_id } = req.body;
    
    const db = new Database();
    await db.initialize();

    // Verify ticket exists and user has access
    const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    if (req.user.role === 'user' && 
        ticket.created_by !== req.user.id && 
        ticket.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied"
        }
      });
    }

    // Verify parent comment exists if specified
    if (parent_id) {
      const parentComment = await db.get(
        'SELECT id FROM comments WHERE id = ? AND ticket_id = ?',
        [parent_id, ticketId]
      );
      
      if (!parentComment) {
        return res.status(400).json({
          error: {
            code: "INVALID_PARENT",
            field: "parent_id",
            message: "Parent comment not found"
          }
        });
      }
    }

    const result = await db.run(
      'INSERT INTO comments (ticket_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [ticketId, req.user.id, content, parent_id || null]
    );

    // Log timeline event
    await logTimeline(db, ticketId, req.user.id, 'comment_added');

    // Get the created comment with user info
    const comment = await db.get(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    // Store idempotency response
    await storeIdempotencyResponse(db, req.idempotencyKey, req.user.id, 201, comment);

    res.status(201).json(comment);

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to add comment"
      }
    });
  }
});

// Delete ticket (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const db = new Database();
    await db.initialize();

    // Check if ticket exists
    const ticket = await db.get('SELECT id, title, created_by FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found"
        }
      });
    }

    // Log the deletion
    await logTimeline(db, ticketId, req.user.id, 'deleted', null, 'Ticket deleted by admin');

    // Delete ticket (CASCADE will handle comments and timeline)
    await db.run('DELETE FROM tickets WHERE id = ?', [ticketId]);

    res.json({
      message: "Ticket deleted successfully",
      deletedTicket: {
        id: ticket.id,
        title: ticket.title
      }
    });

  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete ticket"
      }
    });
  }
});

module.exports = router;