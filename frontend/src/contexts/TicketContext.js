import React, { createContext, useContext, useReducer } from 'react';
import { ticketsAPI, statsAPI } from '../services/api';
import toast from 'react-hot-toast';

const TicketContext = createContext();

// Initial state
const initialState = {
  tickets: [],
  currentTicket: null,
  comments: [],
  timeline: [],
  stats: {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    status: '',
    priority: '',
    sla: '',
    search: '',
  },
  isLoading: false,
  error: null,
};

// Ticket reducer
const ticketReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_TICKETS':
      return {
        ...state,
        tickets: action.payload.tickets || [],
        pagination: action.payload.pagination || state.pagination,
        isLoading: false,
        error: null,
      };
    
    case 'SET_CURRENT_TICKET':
      return {
        ...state,
        currentTicket: action.payload,
        isLoading: false,
        error: null,
      };
    
    case 'SET_COMMENTS':
      return {
        ...state,
        comments: action.payload || [],
        isLoading: false,
      };
    
    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...(state.comments || []), action.payload],
      };
    
    case 'SET_TIMELINE':
      return {
        ...state,
        timeline: action.payload || [],
      };
    
    case 'SET_STATS':
      return {
        ...state,
        stats: action.payload,
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'ADD_TICKET':
      return {
        ...state,
        tickets: [action.payload, ...(state.tickets || [])],
      };
    
    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: (state.tickets || []).map(ticket =>
          ticket.id === action.payload.id ? action.payload : ticket
        ),
        currentTicket: state.currentTicket?.id === action.payload.id 
          ? action.payload 
          : state.currentTicket,
      };
    
    case 'DELETE_TICKET':
      return {
        ...state,
        tickets: (state.tickets || []).filter(ticket => ticket.id !== action.payload),
        currentTicket: state.currentTicket?.id === action.payload ? null : state.currentTicket,
      };
    
    default:
      return state;
  }
};

// Ticket provider component
export const TicketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ticketReducer, initialState);

  // Fetch tickets with filters and pagination
  const fetchTickets = async (params = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const queryParams = {
        ...state.filters,
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...params,
      };

      const response = await ticketsAPI.getTickets(queryParams);
      
      // Ensure response has the expected structure
      const tickets = response.data.items || response.data.tickets || [];
      const pagination = response.data.pagination || state.pagination;
      
      dispatch({
        type: 'SET_TICKETS',
        payload: {
          tickets,
          pagination,
        },
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch tickets';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  // Fetch single ticket
  const fetchTicket = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await ticketsAPI.getTicket(id);
      dispatch({ type: 'SET_CURRENT_TICKET', payload: response.data });
      
      // Also fetch comments and timeline
      await Promise.all([
        fetchComments(id),
        fetchTimeline(id),
      ]);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch ticket';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  // Create new ticket
  const createTicket = async (ticketData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await ticketsAPI.createTicket(ticketData);
      dispatch({ type: 'ADD_TICKET', payload: response.data });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast.success('Ticket created successfully');
      return { success: true, ticket: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create ticket';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update ticket
  const updateTicket = async (id, updates) => {
    try {
      // Add current ticket version for optimistic locking
      const currentTicketData = state.currentTicket || state.tickets.find(t => t.id === parseInt(id));
      const dataWithVersion = {
        ...updates,
        version: currentTicketData?.version || 1
      };
      
      const response = await ticketsAPI.updateTicket(id, dataWithVersion);
      dispatch({ type: 'UPDATE_TICKET', payload: response.data });
      dispatch({ type: 'SET_CURRENT_TICKET', payload: response.data });
      
      toast.success('Ticket updated successfully');
      return { success: true, ticket: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update ticket';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete ticket
  const deleteTicket = async (id) => {
    try {
      await ticketsAPI.deleteTicket(id);
      dispatch({ type: 'DELETE_TICKET', payload: id });
      
      toast.success('Ticket deleted successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete ticket';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Fetch comments for ticket
  const fetchComments = async (ticketId) => {
    try {
      const response = await ticketsAPI.getTicketComments(ticketId);
      dispatch({ type: 'SET_COMMENTS', payload: response.data });
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  // Add comment to ticket
  const addComment = async (ticketId, commentData) => {
    try {
      const response = await ticketsAPI.addComment(ticketId, commentData);
      dispatch({ type: 'ADD_COMMENT', payload: response.data });
      
      toast.success('Comment added successfully');
      return { success: true, comment: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to add comment';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Fetch timeline for ticket
  const fetchTimeline = async (ticketId) => {
    try {
      const response = await ticketsAPI.getTicketTimeline(ticketId);
      dispatch({ type: 'SET_TIMELINE', payload: response.data });
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    }
  };

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await statsAPI.getDashboardStats();
      // Map backend response to frontend format
      const mappedStats = {
        total: response.data.total || 0,
        open: response.data.open || 0,
        inProgress: response.data.in_progress || 0,
        resolved: response.data.resolved || 0,
        closed: response.data.closed || 0,
      };
      dispatch({ type: 'SET_STATS', payload: mappedStats });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Update filters
  const updateFilters = (newFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  };

  // Update pagination
  const updatePagination = (newPagination) => {
    dispatch({
      type: 'SET_TICKETS',
      payload: {
        tickets: state.tickets,
        pagination: { ...state.pagination, ...newPagination },
      },
    });
  };

  const value = {
    ...state,
    fetchTickets,
    fetchTicket,
    createTicket,
    updateTicket,
    deleteTicket,
    fetchComments,
    addComment,
    fetchTimeline,
    fetchStats,
    updateFilters,
    updatePagination,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
};

// Custom hook to use ticket context
export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export default TicketContext;