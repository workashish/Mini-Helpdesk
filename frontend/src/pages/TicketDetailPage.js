import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTickets } from '../contexts/TicketContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeftIcon, 
  ClockIcon, 
  ExclamationIcon,
  UserIcon,
  CalendarIcon,
  ChatAltIcon,
  PaperClipIcon
} from '@heroicons/react/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const TicketDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { 
    currentTicket, 
    comments, 
    timeline, 
    isLoading, 
    fetchTicket, 
    updateTicket,
    addComment 
  } = useTickets();
  
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-yellow-100 text-yellow-800', // Support both formats
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTimelineMessage = (event) => {
    const userName = event.user_name || 'System';
    
    switch (event.action) {
      case 'created':
        return `${userName} created this ticket`;
      case 'status_changed':
        return `${userName} updated status from "${event.old_value || 'unknown'}" to "${event.new_value || 'unknown'}"`;
      case 'priority_changed':
        return `${userName} changed priority from "${event.old_value || 'unknown'}" to "${event.new_value || 'unknown'}"`;
      case 'assigned':
        const oldAssignee = event.old_value ? `"${event.old_value}"` : 'unassigned';
        const newAssignee = event.new_value ? `"${event.new_value}"` : 'unassigned';
        return `${userName} reassigned ticket from ${oldAssignee} to ${newAssignee}`;
      case 'comment_added':
        return `${userName} added a comment`;
      default:
        return `${userName} performed action: ${event.action}`;
    }
  };

  const getTimelineIcon = (action) => {
    switch (action) {
      case 'created':
        return { icon: ExclamationIcon, bgColor: 'bg-green-500' };
      case 'status_changed':
        return { icon: ClockIcon, bgColor: 'bg-blue-500' };
      case 'priority_changed':
        return { icon: ExclamationIcon, bgColor: 'bg-orange-500' };
      case 'assigned':
        return { icon: UserIcon, bgColor: 'bg-purple-500' };
      case 'comment_added':
        return { icon: ChatAltIcon, bgColor: 'bg-gray-500' };
      default:
        return { icon: ClockIcon, bgColor: 'bg-primary-500' };
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (currentTicket) {
      await updateTicket(currentTicket.id, { status: newStatus });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    const result = await addComment(id, { content: newComment });
    
    if (result.success) {
      setNewComment('');
    }
    setIsAddingComment(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <ExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">Ticket not found</h2>
        <p className="mt-2 text-gray-600">The ticket you're looking for doesn't exist or has been deleted.</p>
        <Link
          to="/tickets"
          className="mt-6 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            to="/tickets" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Tickets
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentTicket.title}
          </h1>
          <p className="text-gray-600">Ticket #{currentTicket.id}</p>
        </div>
      </div>

      {/* Ticket Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentTicket.status)}`}>
            {currentTicket.status.replace('_', ' ').replace('-', ' ').toUpperCase()}
          </span>
          
          {/* Status Actions for Admins/Agents */}
          {(user?.role === 'admin' || user?.role === 'agent') && (
            <div className="mt-4 space-y-2">
              <select
                onChange={(e) => handleStatusChange(e.target.value)}
                value={currentTicket.status}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Priority Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
          <div className="flex items-center space-x-2">
            <ExclamationIcon className={`w-5 h-5 ${getPriorityColor(currentTicket.priority)}`} />
            <span className={`text-sm font-medium ${getPriorityColor(currentTicket.priority)}`}>
              {currentTicket.priority.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Category Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
          <div className="flex items-center space-x-2">
            <PaperClipIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-900 capitalize">
              {currentTicket.category || 'General'}
            </span>
          </div>
        </div>

        {/* Created Date Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-900">
              {formatDate(currentTicket.created_at)}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              by {currentTicket.created_by_name || 'Unknown User'}
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Description */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{currentTicket.description}</p>
        </div>
        
        {/* Category */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">Category: </span>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {currentTicket.category}
          </span>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChatAltIcon className="w-5 h-5 mr-2" />
            Comments ({(comments || []).length})
          </h3>
        </div>

        {/* Comments List */}
        <div className="divide-y divide-gray-200">
          {(comments || []).length === 0 ? (
            <div className="px-6 py-8 text-center">
              <ChatAltIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No comments yet</p>
            </div>
          ) : (
            (comments || []).map((comment) => (
              <div key={comment.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <div className="px-6 py-4 border-t border-gray-200">
          <form onSubmit={handleAddComment}>
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary-600" />
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isAddingComment}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    {isAddingComment ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Comment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Timeline */}
      {(timeline || []).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Timeline
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="flow-root">
              <ul className="-mb-8">
                {(timeline || []).map((event, index) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {index !== (timeline || []).length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          {(() => {
                            const { icon: Icon, bgColor } = getTimelineIcon(event.action);
                            return (
                              <span className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center ring-8 ring-white`}>
                                <Icon className="h-4 w-4 text-white" />
                              </span>
                            );
                          })()}
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              {formatTimelineMessage(event)}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(event.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;