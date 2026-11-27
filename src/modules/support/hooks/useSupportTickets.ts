/**
 * useSupportTickets Custom Hook
 * Manages state for fetching tickets and creating tickets
 */

import {useState, useEffect, useCallback} from 'react';
import {getTickets, createTicket, CreateTicketPayload} from '../services/support.api';
import {SupportTicket} from '../types';

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTicketsList = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getTickets({page: 1, limit: 50});
      setTickets(response.data || []);
    } catch (err: any) {
      console.error('Fetch tickets error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchTicketsList(true);
  }, [fetchTicketsList]);

  const handleCreateTicket = useCallback(async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    try {
      setSubmitting(true);
      setError(null);
      const newTicket = await createTicket(payload);
      // Prepend to local tickets list
      setTickets(prev => [newTicket, ...prev]);
      return newTicket;
    } catch (err: any) {
      console.error('Create ticket error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit support ticket';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketsList();
  }, [fetchTicketsList]);

  return {
    tickets,
    loading,
    refreshing,
    error,
    submitting,
    refresh: handleRefresh,
    createTicket: handleCreateTicket,
  };
};
