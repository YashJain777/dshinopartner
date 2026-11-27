import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';

/**
 * Node vocabulary. These five states are the whole language — a timeline never
 * invents a sixth.
 *
 *  done     filled success node with a tick
 *  current  brand node with a halo
 *  pending  hollow node, muted label
 *  blocked  a gate is unmet (warning ring)
 *  failed   expired, cancelled or breached (solid danger with a cross)
 */
export type TimelineNodeState =
  | 'done'
  | 'current'
  | 'pending'
  | 'blocked'
  | 'failed';

/** A milestone in the compact, horizontal variant. */
export interface TimelineMilestone {
  key: string;
  label: string;
  state: TimelineNodeState;
  /** Timestamp or a word like "next" / "blocked". */
  meta?: string;
}

/** A row in the vertical variants. */
export interface TimelineEvent {
  key: string;
  title: string;
  detail?: string;
  /** Right-aligned, tabular, 24-hour. */
  time?: string;
  state: TimelineNodeState;
  /** Extra content under the row — gates, a photo strip. Current node only. */
  children?: React.ReactNode;
  /** Shown beside the title, for example a slot countdown. */
  badge?: React.ReactNode;
}

export interface JobTimelineProps {
  /**
   * compact — four dots in a row. Cards and detail headers.
   * stepper — vertical milestones whose current node carries its gates.
   * full    — every event the backend recorded.
   */
  variant: 'compact' | 'stepper' | 'full';
  milestones?: TimelineMilestone[];
  events?: TimelineEvent[];
  style?: StyleProp<ViewStyle>;
}
