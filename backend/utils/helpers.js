const moment = require('moment');

// SLA configuration (in hours)
const SLA_TIMES = {
  'low': 72,      // 3 days
  'medium': 48,   // 2 days
  'high': 24,     // 1 day
  'critical': 4   // 4 hours
};

const calculateSLADeadline = (priority, createdAt = new Date()) => {
  const hours = SLA_TIMES[priority] || SLA_TIMES['medium'];
  return moment(createdAt).add(hours, 'hours').toISOString();
};

const isSLABreached = (deadline) => {
  return moment().isAfter(moment(deadline));
};

const getSLAStatus = (deadline, status) => {
  if (status === 'resolved' || status === 'closed') {
    return 'met';
  }
  
  const now = moment();
  const deadlineTime = moment(deadline);
  
  if (now.isAfter(deadlineTime)) {
    return 'breached';
  }
  
  const timeLeft = deadlineTime.diff(now, 'hours');
  if (timeLeft <= 4) {
    return 'at_risk';
  }
  
  return 'on_track';
};

const formatTimeRemaining = (deadline) => {
  const now = moment();
  const deadlineTime = moment(deadline);
  
  if (now.isAfter(deadlineTime)) {
    return `Overdue by ${now.diff(deadlineTime, 'hours')} hours`;
  }
  
  const diff = deadlineTime.diff(now);
  const duration = moment.duration(diff);
  
  if (duration.asDays() >= 1) {
    return `${Math.floor(duration.asDays())} days remaining`;
  } else if (duration.asHours() >= 1) {
    return `${Math.floor(duration.asHours())} hours remaining`;
  } else {
    return `${Math.floor(duration.asMinutes())} minutes remaining`;
  }
};

const validatePagination = (limit, offset) => {
  const parsedLimit = parseInt(limit) || 10;
  const parsedOffset = parseInt(offset) || 0;
  
  return {
    limit: Math.min(Math.max(parsedLimit, 1), 100), // Min 1, Max 100
    offset: Math.max(parsedOffset, 0)
  };
};

const buildSearchQuery = (searchTerm) => {
  if (!searchTerm) return { where: '', params: [] };
  
  const term = `%${searchTerm}%`;
  return {
    where: `AND (t.title LIKE ? OR t.description LIKE ? OR EXISTS (
      SELECT 1 FROM comments c WHERE c.ticket_id = t.id AND c.content LIKE ?
      ORDER BY c.created_at DESC LIMIT 1
    ))`,
    params: [term, term, term]
  };
};

const logTimeline = async (db, ticketId, userId, action, oldValue = null, newValue = null) => {
  await db.run(
    'INSERT INTO timeline (ticket_id, user_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
    [ticketId, userId, action, oldValue, newValue]
  );
};

const storeIdempotencyResponse = async (db, key, userId, status, data) => {
  const response = JSON.stringify({ status, data });
  await db.run(
    'INSERT OR REPLACE INTO idempotency_keys (key, user_id, response) VALUES (?, ?, ?)',
    [key, userId, response]
  );
};

module.exports = {
  calculateSLADeadline,
  isSLABreached,
  getSLAStatus,
  formatTimeRemaining,
  validatePagination,
  buildSearchQuery,
  logTimeline,
  storeIdempotencyResponse,
  SLA_TIMES
};