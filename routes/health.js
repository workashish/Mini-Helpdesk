const express = require('express');
const packageJson = require('../package.json');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    service: 'helpdesk-mini'
  });
});

// API metadata endpoint
router.get('/_meta', (req, res) => {
  res.json({
    name: packageJson.name,
    description: packageJson.description,
    version: packageJson.version,
    endpoints: {
      authentication: {
        register: {
          method: 'POST',
          path: '/api/auth/register',
          description: 'Register a new user',
          body: {
            email: 'string (required)',
            password: 'string (required, min 6 chars)',
            name: 'string (required)',
            role: 'string (optional: user, agent, admin)'
          }
        },
        login: {
          method: 'POST',
          path: '/api/auth/login',
          description: 'Login user',
          body: {
            email: 'string (required)',
            password: 'string (required)'
          }
        }
      },
      tickets: {
        list: {
          method: 'GET',
          path: '/api/tickets',
          description: 'Get paginated list of tickets',
          query: {
            limit: 'number (default: 10, max: 100)',
            offset: 'number (default: 0)',
            status: 'string (open, in_progress, resolved, closed)',
            priority: 'string (low, medium, high, critical)',
            assigned_to: 'number (user ID)',
            search: 'string (searches title, description, comments)',
            sla_status: 'string (on_track, at_risk, breached, met)'
          }
        },
        create: {
          method: 'POST',
          path: '/api/tickets',
          description: 'Create a new ticket',
          headers: {
            'Idempotency-Key': 'string (required)'
          },
          body: {
            title: 'string (required)',
            description: 'string (required)',
            priority: 'string (optional: low, medium, high, critical)'
          }
        },
        get: {
          method: 'GET',
          path: '/api/tickets/:id',
          description: 'Get single ticket with comments and timeline'
        },
        update: {
          method: 'PATCH',
          path: '/api/tickets/:id',
          description: 'Update ticket (optimistic locking)',
          body: {
            status: 'string (optional)',
            priority: 'string (optional)',
            assigned_to: 'number (optional)',
            version: 'number (optional, for optimistic locking)'
          }
        },
        comment: {
          method: 'POST',
          path: '/api/tickets/:id/comments',
          description: 'Add comment to ticket',
          headers: {
            'Idempotency-Key': 'string (required)'
          },
          body: {
            content: 'string (required)',
            parent_id: 'number (optional, for threading)'
          }
        }
      },
      users: {
        list: {
          method: 'GET',
          path: '/api/users',
          description: 'Get all users (admin/agent only)'
        },
        profile: {
          method: 'GET',
          path: '/api/users/me',
          description: 'Get current user profile'
        }
      }
    },
    features: [
      'Role-based access control (user, agent, admin)',
      'SLA timers with automatic deadline calculation',
      'Threaded comments on tickets',
      'Pagination with limit/offset',
      'Idempotency for POST requests',
      'Rate limiting (60 requests/minute)',
      'Search across tickets, descriptions, and comments',
      'Optimistic locking for ticket updates',
      'Activity timeline and audit logs'
    ],
    testCredentials: {
      admin: {
        email: 'admin@helpdesk.com',
        password: 'admin123'
      },
      agent: {
        email: 'agent@helpdesk.com',
        password: 'agent123'
      },
      user: {
        email: 'user@helpdesk.com',
        password: 'user123'
      }
    },
    sampleRequests: {
      createTicket: {
        url: 'POST /api/tickets',
        headers: {
          'Authorization': 'Bearer <token>',
          'Idempotency-Key': 'unique-key-123',
          'Content-Type': 'application/json'
        },
        body: {
          title: 'Login issue',
          description: 'Cannot login to the application',
          priority: 'high'
        }
      },
      listTickets: {
        url: 'GET /api/tickets?limit=10&offset=0&status=open',
        headers: {
          'Authorization': 'Bearer <token>'
        }
      },
      addComment: {
        url: 'POST /api/tickets/1/comments',
        headers: {
          'Authorization': 'Bearer <token>',
          'Idempotency-Key': 'comment-key-456',
          'Content-Type': 'application/json'
        },
        body: {
          content: 'I tried resetting my password but still cannot login'
        }
      }
    }
  });
});

module.exports = router;