import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTickets } from '../contexts/TicketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from '@heroicons/react/outline';

const TicketsPage = () => {
  const {
    tickets,
    pagination,
    filters,
    isLoading,
    fetchTickets,
    updateFilters,
  } = useTickets();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchTickets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchTerm });
    fetchTickets({ search: searchTerm, page: 1 });
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { [filterType]: value };
    updateFilters(newFilters);
    fetchTickets({ ...newFilters, page: 1 });
  };

  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    fetchTickets({ sort: field, order: newOrder, page: 1 });
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="mt-2 text-gray-600">
            Manage and track all support requests
          </p>
        </div>
        <div className="mt-4 md:mt-0">
                    <Link
            to="/tickets/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Ticket
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tickets..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner size="large" text="Loading tickets..." />
          </div>
        ) : (tickets || []).length > 0 ? (
          <>
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-1">ID</div>
                <div className="col-span-3">
                  <button
                    onClick={() => handleSort('subject')}
                    className="flex items-center space-x-1 hover:text-primary-600"
                  >
                    <span>Subject</span>
                    {sortBy === 'subject' && (
                      sortOrder === 'asc' ? 
                        <SortAscendingIcon className="w-4 h-4" /> : 
                        <SortDescendingIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2">Created By</div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-primary-600"
                  >
                    <span>Created</span>
                    {sortBy === 'created_at' && (
                      sortOrder === 'asc' ? 
                        <SortAscendingIcon className="w-4 h-4" /> : 
                        <SortDescendingIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {(tickets || []).map((ticket) => (
                <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 text-sm font-medium text-gray-900">
                      #{ticket.id}
                    </div>
                    <div className="col-span-3">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {ticket.title}
                      </Link>
                      <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-sm font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {ticket.created_by_name || 'Unknown'}
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-1">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchTickets({ page: pagination.page - 1 })}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchTickets({ page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FilterIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600 mb-4">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first support ticket.'
              }
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
    </div>
  );
};

export default TicketsPage;