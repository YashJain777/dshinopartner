/**
 * useTicketDetails Custom Hook
 * Manages state for a single ticket and sending replies
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {getTicketById, replyTicket} from '../services/support.api';
import {SupportTicket, SupportTicketMessage} from '../types';

export const useTicketDetails = (ticketId: string) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Keep a ref to prevent polling if screen is unmounted
  const isMounted = useRef(true);

  const fetchTicketDetails = useCallback(async (isRefresh = false) => {
    if (!ticketId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await getTicketById(ticketId);
      if (isMounted.current) {
        setTicket(data);
        setMessages(data.Messages || []);
      }
    } catch (err: any) {
      console.error('Fetch ticket details error:', err);
      if (isMounted.current) {
        setError(err.response?.data?.message || err.message || 'Failed to load ticket details');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [ticketId]);

  const handleRefresh = useCallback(async () => {
    await fetchTicketDetails(true);
  }, [fetchTicketDetails]);

  const handleSendReply = useCallback(async (messageText: string) => {
    if (!ticketId || !messageText.trim()) return;

    try {
      setSending(true);
      setError(null);

      const payload = {
        message: messageText.trim(),
      };

      const newMsg = await replyTicket(ticketId, payload);
      
      // Update local messages array
      if (isMounted.current) {
        setMessages(prev => [...prev, newMsg]);
        // Also update ticket status if it was OPEN (it transitions to IN_PROGRESS in backend)
        if (ticket && ticket.status === 'OPEN') {
          setTicket({
            ...ticket,
            status: 'IN_PROGRESS',
          });
        }
      }
    } catch (err: any) {
      console.error('Reply ticket error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to send reply';
      if (isMounted.current) {
        setError(errMsg);
      }
      throw new Error(errMsg);
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  }, [ticketId, ticket]);

  // Set up polling for new replies every 15 seconds to simulate real-time chat
  useEffect(() => {
    isMounted.current = true;
    fetchTicketDetails();

    const intervalId = setInterval(() => {
      fetchTicketDetails(true);
    }, 15000);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [fetchTicketDetails]);

  return {
    ticket,
    messages,
    loading,
    refreshing,
    error,
    sending,
    refresh: handleRefresh,
    sendReply: handleSendReply,
  };
};
