/**
 * Job status presentation — the single source of the words, icons and colours
 * used for a booking's state anywhere in the redesigned app.
 *
 * Rules this encodes:
 *  - The raw enum never reaches the screen. "PARTNER_ASSIGNED" is "Assigned".
 *  - A status is always icon + word + colour, never colour alone.
 *  - The same status reads identically on a card, a chip and the timeline.
 */

import {BookingStatus} from '../constants/api.constants';
import {IconName} from '../components/atoms/Icon';
import {Tokens} from './tokens';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'teal'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger';

export interface StatusPresentation {
  label: string;
  icon: IconName;
  tone: StatusTone;
}

export const JOB_STATUS_PRESENTATION: Record<BookingStatus, StatusPresentation> = {
  PAYMENT_PENDING: {label: 'Awaiting payment', icon: 'wallet', tone: 'neutral'},
  PLACED: {label: 'Placed', icon: 'clipboard', tone: 'neutral'},
  CONFIRMED: {label: 'Confirmed', icon: 'check', tone: 'neutral'},
  AWAITING_ASSIGNMENT: {label: 'Awaiting a partner', icon: 'clock', tone: 'neutral'},
  PARTNER_ASSIGNED: {label: 'Assigned', icon: 'clipboard', tone: 'neutral'},
  EN_ROUTE: {label: 'On the way', icon: 'navigation', tone: 'info'},
  ON_THE_WAY: {label: 'On the way', icon: 'navigation', tone: 'info'},
  ARRIVED: {label: 'Arrived', icon: 'pinCheck', tone: 'teal'},
  IN_PROGRESS: {label: 'Servicing', icon: 'wrench', tone: 'brand'},
  COMPLETED: {label: 'Done', icon: 'check', tone: 'success'},
  REVIEWED: {label: 'Done', icon: 'check', tone: 'success'},
  CANCELLED: {label: 'Cancelled', icon: 'close', tone: 'neutral'},
  SLA_BREACHED: {label: 'SLA breach', icon: 'alert', tone: 'danger'},
};

export interface TonePalette {
  background: string;
  foreground: string;
  border: string;
  /** Colour of a filled dot or solid node for this tone. */
  solid: string;
  /** Text that sits on top of `solid`. */
  onSolid: string;
}

export const resolveTone = (tone: StatusTone, t: Tokens): TonePalette => {
  switch (tone) {
    case 'info':
      return {
        background: t.infoContainer,
        foreground: t.infoInk,
        border: t.infoContainer,
        solid: t.info,
        onSolid: t.surface,
      };
    case 'teal':
      return {
        background: t.tealContainer,
        foreground: t.tealInk,
        border: t.tealContainer,
        solid: t.teal,
        onSolid: t.surface,
      };
    case 'brand':
      return {
        background: t.brandContainer,
        foreground: t.brandInk,
        border: t.brandBorder,
        solid: t.brand,
        onSolid: t.brandActionText,
      };
    case 'success':
      return {
        background: t.successContainer,
        foreground: t.successInk,
        border: t.successBorder,
        solid: t.success,
        onSolid: t.successOnSolid,
      };
    case 'warning':
      return {
        background: t.warningContainer,
        foreground: t.warningInk,
        border: t.warningBorder,
        solid: t.warning,
        onSolid: t.warningOnSolid,
      };
    case 'danger':
      return {
        background: t.dangerContainer,
        foreground: t.dangerInk,
        border: t.dangerBorder,
        solid: t.danger,
        onSolid: t.dangerOnSolid,
      };
    case 'neutral':
    default:
      return {
        background: t.neutralContainer,
        foreground: t.neutralInk,
        border: t.outline,
        solid: t.textTertiary,
        onSolid: t.surface,
      };
  }
};

export const getStatusPresentation = (status: BookingStatus): StatusPresentation =>
  JOB_STATUS_PRESENTATION[status] ?? JOB_STATUS_PRESENTATION.PARTNER_ASSIGNED;
