const Database = require('../database/db');
const { calculateSLADeadline, logTimeline } = require('../utils/helpers');

async function seedDatabase() {
  console.log('Starting database seeding...');
  
  const db = new Database();
  await db.initialize();

  try {
    // Create sample tickets
    const sampleTickets = [
      {
        title: 'Login page not loading',
        description: 'Users are reporting that the login page is not loading properly. The page appears blank after clicking the login button.',
        priority: 'high',
        status: 'open',
        created_by: 3 // user@helpdesk.com
      },
      {
        title: 'Password reset email not received',
        description: 'Several users have reported not receiving password reset emails. This affects user account recovery.',
        priority: 'medium',
        status: 'in_progress',
        created_by: 3,
        assigned_to: 2 // agent@helpdesk.com
      },
      {
        title: 'Database performance issues',
        description: 'The application is experiencing slow response times, particularly during peak hours. Database queries are taking longer than usual.',
        priority: 'critical',
        status: 'open',
        created_by: 2
      },
      {
        title: 'Mobile app crashes on startup',
        description: 'Users on iOS devices are experiencing crashes when launching the mobile application. This affects approximately 15% of mobile users.',
        priority: 'high',
        status: 'resolved',
        created_by: 3,
        assigned_to: 2
      },
      {
        title: 'Feature request: Dark mode',
        description: 'Users have requested a dark mode option for the application interface to reduce eye strain during night usage.',
        priority: 'low',
        status: 'open',
        created_by: 3
      }
    ];

    console.log('Creating sample tickets...');
    const ticketIds = [];
    
    for (const ticket of sampleTickets) {
      const slaDeadline = calculateSLADeadline(ticket.priority);
      
      const result = await db.run(
        'INSERT INTO tickets (title, description, priority, status, sla_deadline, created_by, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ticket.title, ticket.description, ticket.priority, ticket.status, slaDeadline, ticket.created_by, ticket.assigned_to || null]
      );
      
      ticketIds.push(result.id);
      
      // Log timeline events
      await logTimeline(db, result.id, ticket.created_by, 'created');
      
      if (ticket.assigned_to) {
        await logTimeline(db, result.id, ticket.assigned_to, 'assigned', null, ticket.assigned_to);
      }
      
      if (ticket.status !== 'open') {
        await logTimeline(db, result.id, ticket.assigned_to || ticket.created_by, 'status_changed', 'open', ticket.status);
      }
    }

    // Create sample comments
    const sampleComments = [
      {
        ticket_id: ticketIds[0],
        user_id: 2, // agent
        content: 'I\'ve been able to reproduce this issue. It appears to be related to a recent deployment. Investigating further.'
      },
      {
        ticket_id: ticketIds[0],
        user_id: 3, // user
        content: 'Thank you for looking into this. The issue is still occurring as of this morning.'
      },
      {
        ticket_id: ticketIds[1],
        user_id: 2, // agent
        content: 'I\'ve checked the email service logs and found the issue. Working on a fix now.'
      },
      {
        ticket_id: ticketIds[1],
        user_id: 2, // agent
        content: 'The email service has been restarted and the queue has been processed. Please try requesting a password reset again.'
      },
      {
        ticket_id: ticketIds[3],
        user_id: 2, // agent
        content: 'This issue has been resolved with the latest mobile app update (v2.1.3). Please update your app from the app store.'
      }
    ];

    console.log('Creating sample comments...');
    for (const comment of sampleComments) {
      await db.run(
        'INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)',
        [comment.ticket_id, comment.user_id, comment.content]
      );
      
      // Log timeline event
      await logTimeline(db, comment.ticket_id, comment.user_id, 'comment_added');
    }

    console.log('Database seeding completed successfully!');
    console.log(`Created ${ticketIds.length} sample tickets and ${sampleComments.length} comments.`);
    
    // Display statistics
    const stats = await db.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tickets 
      GROUP BY status
    `);
    
    console.log('\nTicket statistics:');
    stats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count} tickets`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;