# HelpDesk Mini - Full Stack Ticketing System

A comprehensive ticketing system with React frontend, Node.js backend, SLA timers, role-based access control, and threaded comments.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+

### Installation & Setup

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Start the application:**
   ```bash
   ./start.sh
   ```

   Or manually:
   ```bash
   # Terminal 1 - Backend (port 9000)
   npm run dev
   
   # Terminal 2 - Frontend (port 3000)
   cd frontend && npm start
   ```

### 🌐 Access Points

- **Frontend Application:** http://localhost:3000
- **Backend API:** http://localhost:9000/api
- **API Health Check:** http://localhost:9000/api/health
- **API Documentation:** http://localhost:9000/api/_meta

## Features

- **Role-Based Access Control**: Three user roles (user, agent, admin) with appropriate permissions
- **SLA Timer Management**: Automatic deadline calculation based on priority levels
- **Threaded Comments**: Nested comment system for ticket discussions
- **Search & Filtering**: Full-text search across tickets, descriptions, and comments
- **Pagination**: Efficient data loading with limit/offset pagination
- **Idempotency**: Safe retry mechanism for POST operations
- **Rate Limiting**: 60 requests per minute per user
- **Optimistic Locking**: Prevent concurrent update conflicts
- **Activity Timeline**: Comprehensive audit trail for all ticket changes

## Architecture

This application implements a modern REST API architecture with clear separation between frontend and backend layers. The Node.js Express backend serves as a stateless API server using SQLite for persistent storage with comprehensive indexing for optimal performance. JWT-based authentication ensures secure, scalable user sessions across distributed environments.

Key architectural decisions include: Role-based access control for multi-tenant security, optimistic locking for concurrent data integrity, idempotency keys for reliable operation retries, and comprehensive audit logging through timeline tracking. The frontend uses vanilla JavaScript with modular component architecture for maintainability. Rate limiting and input validation provide robust security boundaries, while pagination and search capabilities ensure scalable data handling as the system grows.

The SQLite database schema uses foreign key constraints and indexes to maintain data integrity and query performance, making this solution suitable for small to medium-scale deployments with enterprise-grade reliability requirements.

## API Summary

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Ticket Endpoints
- `GET /api/tickets` - List tickets with filtering and pagination
- `POST /api/tickets` - Create new ticket (requires Idempotency-Key)
- `GET /api/tickets/:id` - Get ticket details with comments and timeline
- `PATCH /api/tickets/:id` - Update ticket (supports optimistic locking)
- `POST /api/tickets/:id/comments` - Add comment to ticket (requires Idempotency-Key)

### User Endpoints
- `GET /api/users` - List all users (admin/agent only)
- `GET /api/users/me` - Get current user profile

### System Endpoints
- `GET /api/health` - Health check
- `GET /api/_meta` - API documentation and metadata
- `GET /.well-known/hackathon.json` - Service discovery

## Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Seed the database with sample data:**
   ```bash
   npm run seed
   ```

4. **Access the application:**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:9000/api/_meta
   - Health Check: http://localhost:9000/api/health
   - Service Discovery: http://localhost:9000/.well-known/hackathon.json

## Test User Credentials

The system comes with pre-configured test users:

| Role  | Email | Password | Capabilities |
|-------|-------|----------|--------------|
| Admin | admin@helpdesk.com | admin123 | Full system access |
| Agent | agent@helpdesk.com | agent123 | Ticket management, user support |
| User  | user@helpdesk.com | user123 | Create tickets, view own tickets |

## Sample API Requests

### 1. User Login
```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@helpdesk.com","password":"user123"}'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 3,
    "email": "user@helpdesk.com",
    "name": "Regular User",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Create Ticket
```bash
curl -X POST http://localhost:9000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "title": "Cannot access dashboard",
    "description": "Getting 500 error when trying to access the main dashboard",
    "priority": "high"
  }'
```

**Response:**
```json
{
  "id": 6,
  "title": "Cannot access dashboard",
  "description": "Getting 500 error when trying to access the main dashboard",
  "status": "open",
  "priority": "high",
  "sla_deadline": "2025-10-05T02:00:00.000Z",
  "sla_status": "on_track",
  "time_remaining": "23 hours remaining",
  "created_by": 3,
  "created_by_name": "Regular User",
  "version": 1
}
```

### 3. List Tickets with Filtering
```bash
curl "http://localhost:9000/api/tickets?status=open&priority=high&limit=5&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Login page not loading",
      "status": "open",
      "priority": "high",
      "sla_status": "at_risk",
      "time_remaining": "2 hours remaining",
      "comment_count": 2
    }
  ],
  "pagination": {
    "limit": 5,
    "offset": 0,
    "total": 1,
    "next_offset": null
  }
}
```

### 4. Add Comment to Ticket
```bash
curl -X POST http://localhost:9000/api/tickets/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: comment-key-456" \
  -d '{"content": "I tried clearing my browser cache but the issue persists"}'
```

**Response:**
```json
{
  "id": 6,
  "ticket_id": 1,
  "user_id": 3,
  "content": "I tried clearing my browser cache but the issue persists",
  "parent_id": null,
  "user_name": "Regular User",
  "user_email": "user@helpdesk.com",
  "created_at": "2025-10-04T02:00:00.000Z"
}
```

### 5. Update Ticket Status
```bash
curl -X PATCH http://localhost:9000/api/tickets/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "in_progress",
    "assigned_to": 2,
    "version": 1
  }'
```

## Key Implementation Features

### SLA Management
- **Automatic Deadline Calculation**: Based on priority levels (Critical: 4h, High: 24h, Medium: 48h, Low: 72h)
- **Status Tracking**: Real-time SLA status (on_track, at_risk, breached, met)
- **Time Remaining Display**: Human-readable time calculations

### Pagination Support
All list endpoints support pagination with `limit` and `offset` parameters:
- Default limit: 10 items
- Maximum limit: 100 items
- Response includes `next_offset` for easy pagination

### Idempotency
POST endpoints require an `Idempotency-Key` header to prevent duplicate operations:
- Keys are stored per user for 24 hours
- Duplicate requests return the original response
- Ensures safe retry mechanisms

### Rate Limiting
- **Limit**: 60 requests per minute per user
- **Headers**: Includes rate limit information in response headers
- **Error Response**: 429 status with structured error format

### Error Handling
Consistent error format across all endpoints:
```json
{
  "error": {
    "code": "FIELD_REQUIRED",
    "field": "email",
    "message": "Email is required"
  }
}
```

### Optimistic Locking
Ticket updates support version-based optimistic locking:
- Include `version` field in PATCH requests
- Returns 409 status if version is stale
- Prevents lost update problems

## Seed Data

The application includes comprehensive seed data:
- **5 sample tickets** with various statuses and priorities
- **5 sample comments** demonstrating threaded discussions
- **Complete timeline** showing all ticket activities
- **Realistic scenarios** covering common helpdesk use cases

## Testing

Run the included test suite:
```bash
npm test
```

The tests cover:
- Authentication flows
- CRUD operations for tickets
- Permission enforcement
- SLA calculations
- Pagination logic
- Error handling

## Development

For development with auto-reload:
```bash
npm run dev
```

This starts the server with nodemon for automatic restarts on file changes.

## Production Deployment

For production deployment:
1. Set environment variables:
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your-secure-secret-key
   export PORT=9000
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Technical Specifications

- **Node.js**: >=16.0.0
- **Database**: SQLite with comprehensive indexing
- **Authentication**: JWT with 24-hour expiration
- **Rate Limiting**: 60 requests/minute per user
- **File Upload**: Not implemented (out of scope)
- **Real-time Updates**: Not implemented (WebSocket could be added)

## Security Features

- **Helmet**: Security headers and XSS protection
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Express-validator for request validation
- **SQL Injection Prevention**: Parameterized queries
- **Authentication**: JWT-based stateless authentication
- **Authorization**: Role-based access control

This HelpDesk Mini application provides a robust foundation for ticket management with enterprise-grade features in a lightweight, easy-to-deploy package.# Mini-Helpdesk
