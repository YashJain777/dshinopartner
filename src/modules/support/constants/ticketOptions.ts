/**
 * Support Ticket Form Options
 * Aligned strictly with backend Joi validation enums
 */

import { SupportCategory, SupportPriority } from '../types';

export interface TicketOption<T> {
  label: string;
  value: T;
}

export const SUPPORT_CATEGORIES: TicketOption<SupportCategory>[] = [
  { label: 'Payout & Wallet Issues', value: 'payment_issue' },
  { label: 'Booking & Job Inquiries', value: 'booking_issue' },
  { label: 'App Technical Bugs', value: 'app_bug' },
  { label: 'Quality Issue', value: 'quality_issue' },
  { label: 'Partner Complaint', value: 'partner_complaint' },
  { label: 'Safety Concerns', value: 'safety' },
  { label: 'General Queries', value: 'general' },
];

export const SUPPORT_PRIORITIES: TicketOption<SupportPriority>[] = [
  { label: 'High (Immediate Action)', value: 'high' },
  { label: 'Medium (Standard)', value: 'medium' },
  { label: 'Low (Informational)', value: 'low' },
];
