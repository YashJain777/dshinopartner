/**
 * Support API Service
 * Handles support ticket HTTP requests using apiClient
 */

import apiClient, {ApiResponse, replaceUrlParams} from '../../../services/api/client';
import {API_ENDPOINTS} from '../../../constants/api.constants';
import {SupportTicket, SupportCategory, SupportPriority} from '../types';
import {PaginatedResponse} from '../../../types/api.types';

export interface CreateTicketPayload {
  subject: string;
  description: string;
  type: SupportCategory;
  priority: SupportPriority;
  bookingId?: string | null;
  attachments?: string[];
}

export interface ReplyTicketPayload {
  message: string;
  attachments?: string[];
}

/**
 * Fetch all tickets for the active partner
 */
export const getTickets = async (params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<SupportTicket>> => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<SupportTicket>>>(
    API_ENDPOINTS.GET_TICKETS,
    {params}
  );
  return response.data.data;
};

/**
 * Fetch a single ticket detail with message replies
 */
export const getTicketById = async (ticketId: string): Promise<SupportTicket> => {
  const url = replaceUrlParams(API_ENDPOINTS.GET_TICKET, {id: ticketId});
  const response = await apiClient.get<ApiResponse<SupportTicket>>(url);
  return response.data.data;
};

/**
 * Create a new support ticket
 */
export const createTicket = async (payload: CreateTicketPayload): Promise<SupportTicket> => {
  const response = await apiClient.post<ApiResponse<SupportTicket>>(
    API_ENDPOINTS.CREATE_TICKET,
    payload
  );
  return response.data.data;
};

/**
 * Send a reply/comment to a support ticket
 */
export const replyTicket = async (ticketId: string, payload: ReplyTicketPayload): Promise<any> => {
  const url = replaceUrlParams(API_ENDPOINTS.REPLY_TICKET, {id: ticketId});
  const response = await apiClient.post<ApiResponse<any>>(url, payload);
  return response.data.data;
};
