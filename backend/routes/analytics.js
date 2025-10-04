const express = require('express');
const Database = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get analytics data
router.get('/', authenticateToken, requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { period = '30', type = 'overview' } = req.query;
    
    const db = new Database();
    await db.initialize();

    const analytics = {};

    // Date range calculation
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split('T')[0];

    if (type === 'overview' || type === 'all') {
      // Ticket creation trends
      analytics.ticketTrends = await db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          priority
        FROM tickets 
        WHERE created_at >= ?
        GROUP BY DATE(created_at), priority
        ORDER BY date DESC
      `, [startDateStr]);

      // Resolution time analytics
      analytics.resolutionTime = await db.all(`
        SELECT 
          AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 24 as avg_hours,
          priority,
          COUNT(*) as count
        FROM tickets 
        WHERE status IN ('resolved', 'closed') 
        AND updated_at >= ?
        GROUP BY priority
      `, [startDateStr]);

      // Status distribution
      analytics.statusDistribution = await db.all(`
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tickets WHERE created_at >= ?), 2) as percentage
        FROM tickets 
        WHERE created_at >= ?
        GROUP BY status
      `, [startDateStr, startDateStr]);

      // Agent performance
      analytics.agentPerformance = await db.all(`
        SELECT 
          u.name,
          u.email,
          COUNT(t.id) as assigned_tickets,
          COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
          ROUND(COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) * 100.0 / COUNT(t.id), 2) as resolution_rate
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_to AND t.created_at >= ?
        WHERE u.role IN ('agent', 'admin')
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(t.id) > 0
        ORDER BY resolution_rate DESC
      `, [startDateStr]);
    }

    if (type === 'priority' || type === 'all') {
      // Priority distribution over time
      analytics.priorityTrends = await db.all(`
        SELECT 
          DATE(created_at) as date,
          priority,
          COUNT(*) as count
        FROM tickets 
        WHERE created_at >= ?
        GROUP BY DATE(created_at), priority
        ORDER BY date DESC, priority
      `, [startDateStr]);
    }

    if (type === 'sla' || type === 'all') {
      // SLA compliance
      analytics.slaCompliance = await db.all(`
        SELECT 
          CASE 
            WHEN sla_deadline IS NULL THEN 'No SLA'
            WHEN status IN ('resolved', 'closed') AND updated_at <= sla_deadline THEN 'Met'
            WHEN status NOT IN ('resolved', 'closed') AND datetime('now') <= sla_deadline THEN 'On Track'
            ELSE 'Breached'
          END as sla_status,
          COUNT(*) as count,
          priority
        FROM tickets 
        WHERE created_at >= ?
        GROUP BY sla_status, priority
      `, [startDateStr]);
    }

    // Summary statistics
    analytics.summary = await db.get(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_tickets,
        AVG(CASE 
          WHEN status IN ('resolved', 'closed') 
          THEN JULIANDAY(updated_at) - JULIANDAY(created_at) 
        END) * 24 as avg_resolution_hours
      FROM tickets 
      WHERE created_at >= ?
    `, [startDateStr]);

    res.json({
      period: daysAgo,
      startDate: startDateStr,
      endDate: new Date().toISOString().split('T')[0],
      ...analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch analytics data"
      }
    });
  }
});

// Get ticket volume by hour (for heatmap)
router.get('/heatmap', authenticateToken, requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { days = '7' } = req.query;
    
    const db = new Database();
    await db.initialize();

    const daysAgo = parseInt(days);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split('T')[0];

    const heatmapData = await db.all(`
      SELECT 
        strftime('%w', created_at) as day_of_week,
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM tickets 
      WHERE created_at >= ?
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `, [startDateStr]);

    res.json(heatmapData);

  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch heatmap data"
      }
    });
  }
});

module.exports = router;