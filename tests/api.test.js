const request = require('supertest');
const app = require('../server');

describe('API Integration Tests', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Create test users and get tokens
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@helpdesk.com',
        password: 'admin123'
      });
    
    adminToken = adminResponse.body.token;

    const userResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@helpdesk.com',
        password: 'user123'
      });
    
    userToken = userResponse.body.token;
  });

  describe('Health Endpoints', () => {
    test('GET /api/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('GET /api/_meta should return API metadata', async () => {
      const response = await request(app)
        .get('/api/_meta')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('features');
    });

    test('GET /.well-known/hackathon.json should return service info', async () => {
      const response = await request(app)
        .get('/.well-known/hackathon.json')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'HelpDesk Mini');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@helpdesk.com',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    test('POST /api/auth/login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Tickets API', () => {
    let ticketId;

    test('POST /api/tickets should create ticket with idempotency', async () => {
      const idempotencyKey = `test-${Date.now()}`;
      
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Test Ticket',
          description: 'This is a test ticket',
          priority: 'high'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Ticket');
      expect(response.body).toHaveProperty('priority', 'high');
      expect(response.body).toHaveProperty('sla_deadline');
      expect(response.body).toHaveProperty('version', 1);

      ticketId = response.body.id;

      // Test idempotency - same request should return same result
      const duplicateResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Test Ticket',
          description: 'This is a test ticket',
          priority: 'high'
        })
        .expect(201);

      expect(duplicateResponse.body.id).toBe(ticketId);
    });

    test('GET /api/tickets should support pagination', async () => {
      const response = await request(app)
        .get('/api/tickets?limit=2&offset=0')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('offset', 0);
      expect(response.body.pagination).toHaveProperty('total');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    test('GET /api/tickets should support search', async () => {
      const response = await request(app)
        .get('/api/tickets?search=test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    test('PATCH /api/tickets/:id should support optimistic locking', async () => {
      // First update with correct version
      const response = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          version: 1
        })
        .expect(200);

      expect(response.body).toHaveProperty('version', 2);

      // Try to update with stale version
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          version: 1 // stale version
        })
        .expect(409);
    });

    test('POST /api/tickets/:id/comments should add threaded comments', async () => {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `comment-${Date.now()}`)
        .send({
          content: 'This is a test comment'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'This is a test comment');
      expect(response.body).toHaveProperty('ticket_id', ticketId);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // This test would require making many requests quickly
      // For now, we'll just test that the headers are present
      const response = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    }, 30000);
  });

  describe('SLA Management', () => {
    test('Should calculate SLA deadlines correctly', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `sla-test-${Date.now()}`)
        .send({
          title: 'Critical Issue',
          description: 'This is critical',
          priority: 'critical'
        })
        .expect(201);

      expect(response.body).toHaveProperty('sla_deadline');
      expect(response.body).toHaveProperty('sla_status');
      expect(response.body).toHaveProperty('time_remaining');
      
      // Critical priority should have shorter deadline
      const deadline = new Date(response.body.sla_deadline);
      const now = new Date();
      const diffHours = (deadline - now) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThanOrEqual(4); // Critical = 4 hours
    });
  });

  describe('Error Handling', () => {
    test('Should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', `error-test-${Date.now()}`)
        .send({
          // Missing required title
          description: 'Missing title'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    test('Should require authentication', async () => {
      await request(app)
        .get('/api/tickets')
        .expect(401);
    });
  });
});