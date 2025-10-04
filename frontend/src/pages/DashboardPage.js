import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationIcon,
  TrendingUpIcon,
  PlusIcon,
} from '@heroicons/react/outline';

const DashboardPage = () => {
  const { user } = useAuth();
  const { stats, tickets, isLoading, fetchStats, fetchTickets } = useTickets();

  useEffect(() => {
    fetchStats();
    fetchTickets({ limit: 5 }); // Get latest 5 tickets for preview
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  const getSLAStatus = (slaStatus) => {
    const colors = {
      safe: 'text-green-600',
      warning: 'text-yellow-600',
      breached: 'text-red-600',
    };
    return colors[slaStatus] || 'text-gray-600';
  };

  const dashboardCards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: TicketIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: 'Open Tickets',
      value: stats.open,
      icon: ExclamationIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
  ];

  const recentTickets = (tickets || []).slice(0, 5);

  if (isLoading && !stats.total) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's an overview of your helpdesk activity.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value || 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
          <Link
            to="/tickets"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            View all tickets
          </Link>
        </div>

        {recentTickets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors duration-200"
                      >
                        #{ticket.id} - {ticket.subject}
                      </Link>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="mt-1 text-gray-600 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="font-medium">Priority:</span>
                        <span className={`ml-1 capitalize font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      
                      {ticket.sla_status && (
                        <div className="flex items-center">
                          <span className="font-medium">SLA:</span>
                          <span className={`ml-1 capitalize font-medium ${getSLAStatus(ticket.sla_status)}`}>
                            {ticket.sla_status}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <span className="font-medium">Created:</span>
                        <span className="ml-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first support ticket.
            </p>
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create First Ticket
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/tickets/new"
            className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <PlusIcon className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Create Ticket</h3>
              <p className="text-sm text-gray-600">Submit a new support request</p>
            </div>
          </Link>

          <Link
            to="/tickets?status=open"
            className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <ExclamationIcon className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Open Tickets</h3>
              <p className="text-sm text-gray-600">View all open tickets</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          >
            <TrendingUpIcon className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600">Update account settings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;