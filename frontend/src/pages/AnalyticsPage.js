import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  ExclamationIcon,
} from '@heroicons/react/outline';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const { stats, isLoading, fetchStats } = useTickets();

  useEffect(() => {
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if user has access to analytics (admin only)
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <ExclamationIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">
            Analytics are only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" text="Loading analytics..." />
      </div>
    );
  }

  const analyticsCards = [
    {
      title: 'Total Tickets',
      value: stats.total || 0,
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      change: '+12%',
      changeType: 'increase',
    },
    {
      title: 'Open Tickets',
      value: stats.open || 0,
      icon: ExclamationIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      change: '-5%',
      changeType: 'decrease',
    },
    {
      title: 'Resolution Rate',
      value: `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`,
      icon: TrendingUpIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      change: '+8%',
      changeType: 'increase',
    },
    {
      title: 'Avg Response Time',
      value: '2.4h',
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      change: '-15min',
      changeType: 'decrease',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monitor performance metrics and ticket statistics
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-3xl font-bold ${card.textColor} mt-2`}>
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  {card.changeType === 'increase' ? (
                    <TrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ticket Status Distribution
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                <span className="text-sm text-gray-700">Open</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.open || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span className="text-sm text-gray-700">In Progress</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.inProgress || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                <span className="text-sm text-gray-700">Resolved</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.resolved || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                <span className="text-sm text-gray-700">Closed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.closed || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity Summary
          </h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Tickets created today</span>
              <span className="font-medium text-gray-900">3</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Tickets resolved today</span>
              <span className="font-medium text-gray-900">7</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Active agents</span>
              <span className="font-medium text-gray-900">5</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Average resolution time</span>
              <span className="font-medium text-gray-900">2.4 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;