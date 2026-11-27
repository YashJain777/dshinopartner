/**
 * Support Module TypeScript Definitions
 */

export type SupportCategory =
  | 'payment_issue'
  | 'booking_issue'
  | 'app_bug'
  | 'partner_complaint'
  | 'quality_issue'
  | 'safety'
  | 'general';
export type SupportPriority = 'low' | 'medium' | 'high';
export type SupportTicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  bookingId: string | null;
  raisedById: string;
  raisedByType: 'partner' | 'customer';
  subject: string;
  description: string;
  type: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  currentLevel: 'L1' | 'L2';
  agencyId: string | null;
  assignedToId: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  closedAt: string | null;
  closedById: string | null;
  createdAt: string;
  updatedAt: string;
  Messages?: SupportTicketMessage[];
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderType: 'partner' | 'customer' | 'admin' | 'agency';
  senderId: string;
  senderName: string | null;
  message: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: string;
}
