/**
 * JobTimeline — one component, three densities.
 *
 * The rail carries the state: green behind completed nodes, brand into the
 * current one, grey ahead. Nothing is ever truncated with a "show more" —
 * a long log scrolls, because a partner disputing a penalty needs every row.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {Tokens} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';
import {
  JobTimelineProps,
  TimelineEvent,
  TimelineMilestone,
  TimelineNodeState,
} from './JobTimeline.types';

// ─── Node ────────────────────────────────────────────────────────────────────

interface NodeColours {
  background: string;
  border: string;
  ring?: string;
  tick?: string;
}

const nodeColours = (state: TimelineNodeState, t: Tokens): NodeColours => {
  switch (state) {
    case 'done':
      return {background: t.success, border: t.success, tick: t.successOnSolid};
    case 'current':
      return {background: t.brand, border: t.brand, ring: t.brandContainer};
    case 'blocked':
      return {background: t.warningContainer, border: t.warning};
    case 'failed':
      return {background: t.danger, border: t.danger, tick: t.dangerOnSolid};
    case 'pending':
    default:
      return {background: t.surface, border: t.outlineStrong};
  }
};

const Node: React.FC<{state: TimelineNodeState; size: number}> = ({state, size}) => {
  const {t} = useTheme();
  const c = nodeColours(state, t);
  const ringWidth = state === 'current' ? 4 : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.background,
        borderWidth: state === 'pending' || state === 'blocked' ? 2 : ringWidth,
        borderColor: state === 'current' ? c.ring : c.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {state === 'done' ? (
        <Icon name="check" size={size * 0.55} color={c.tick} strokeWidth={3.2} />
      ) : null}
      {state === 'failed' ? (
        <Icon name="close" size={size * 0.52} color={c.tick} strokeWidth={3.2} />
      ) : null}
      {state === 'blocked' ? (
        <Icon name="lock" size={size * 0.52} color={t.warning} strokeWidth={2.6} />
      ) : null}
    </View>
  );
};

/**
 * Colour of the rail between node i and node i+1. Completed stretch is green,
 * the stretch entering the current node is brand, everything ahead is grey.
 */
const railColour = (
  from: TimelineNodeState,
  to: TimelineNodeState | undefined,
  t: Tokens,
): string => {
  if (from !== 'done') {
    return t.outline;
  }
  return to === 'current' ? t.brand : t.success;
};

// ─── Compact ─────────────────────────────────────────────────────────────────

const Compact: React.FC<{milestones: TimelineMilestone[]}> = ({milestones}) => {
  const {t} = useTheme();

  return (
    <View style={styles.compactWrap}>
      <View style={styles.compactRail}>
        {milestones.map((m, i) => (
          <React.Fragment key={m.key}>
            <Node state={m.state} size={14} />
            {i < milestones.length - 1 ? (
              <View
                style={[
                  styles.compactSegment,
                  {backgroundColor: railColour(m.state, milestones[i + 1]?.state, t)},
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.compactLabels}>
        {milestones.map((m, i) => {
          const align =
            i === 0 ? 'flex-start' : i === milestones.length - 1 ? 'flex-end' : 'center';
          const active = m.state === 'current' || m.state === 'blocked';
          const muted = m.state === 'pending';
          return (
            <View key={m.key} style={[styles.compactLabelCell, {alignItems: align}]}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: muted ? '600' : '700',
                  color: active
                    ? m.state === 'blocked'
                      ? t.warningInk
                      : t.brandInk
                    : muted
                    ? t.textDisabled
                    : t.textSecondary,
                }}
                numberOfLines={1}>
                {m.label}
              </Text>
              {m.meta ? (
                <Text
                  style={[
                    numeric,
                    {
                      fontSize: 10,
                      color: m.state === 'blocked' ? t.warning : t.textDisabled,
                      fontWeight: m.state === 'blocked' ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}>
                  {m.meta}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Vertical (stepper + full) ───────────────────────────────────────────────

const Vertical: React.FC<{events: TimelineEvent[]; dense: boolean}> = ({
  events,
  dense,
}) => {
  const {t} = useTheme();
  const nodeSize = dense ? 22 : 20;

  return (
    <View>
      {events.map((e, i) => {
        const isLast = i === events.length - 1;
        const muted = e.state === 'pending';
        const titleColour =
          e.state === 'current'
            ? t.textHeading
            : e.state === 'failed'
            ? t.dangerInk
            : e.state === 'blocked'
            ? t.warningInk
            : muted
            ? t.textDisabled
            : t.textSecondary;

        return (
          <View key={e.key} style={styles.vRow}>
            <View style={[styles.vRail, {width: nodeSize}]}>
              <Node state={e.state} size={nodeSize} />
              {!isLast ? (
                <View
                  style={[
                    styles.vSegment,
                    {backgroundColor: railColour(e.state, events[i + 1]?.state, t)},
                  ]}
                />
              ) : null}
            </View>

            <View style={[styles.vBody, isLast ? null : styles.vBodySpaced]}>
              <View style={styles.vHeadRow}>
                <View style={styles.vHeadText}>
                  <Text
                    style={{
                      fontSize: e.state === 'current' ? 15 : 14,
                      fontWeight: '700',
                      color: titleColour,
                    }}>
                    {e.title}
                  </Text>
                  {e.detail ? (
                    <Text
                      style={[
                        numeric,
                        {
                          fontSize: 12,
                          lineHeight: 17,
                          marginTop: 2,
                          color:
                            e.state === 'failed'
                              ? t.dangerInk
                              : e.state === 'blocked'
                              ? t.warningInk
                              : muted
                              ? t.textDisabled
                              : t.textTertiary,
                        },
                      ]}>
                      {e.detail}
                    </Text>
                  ) : null}
                </View>

                {e.badge ? (
                  <View style={styles.vBadge}>{e.badge}</View>
                ) : e.time ? (
                  <Text style={[numeric, styles.vTime, {color: t.textTertiary}]}>
                    {e.time}
                  </Text>
                ) : null}
              </View>

              {e.children ? <View style={styles.vChildren}>{e.children}</View> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─── Public ──────────────────────────────────────────────────────────────────

export const JobTimeline: React.FC<JobTimelineProps> = ({
  variant,
  milestones = [],
  events = [],
  style,
}) => {
  if (variant === 'compact') {
    return (
      <View style={style}>
        <Compact milestones={milestones} />
      </View>
    );
  }

  return (
    <View style={style}>
      <Vertical events={events} dense={variant === 'stepper'} />
    </View>
  );
};

const styles = StyleSheet.create({
  compactWrap: {
    gap: 10,
  },
  compactRail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  compactSegment: {
    flex: 1,
    height: 2,
  },
  compactLabels: {
    flexDirection: 'row',
  },
  compactLabelCell: {
    flex: 1,
    gap: 1,
  },
  vRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vRail: {
    alignItems: 'center',
  },
  vSegment: {
    width: 2,
    flex: 1,
  },
  vBody: {
    flex: 1,
    minWidth: 0,
  },
  vBodySpaced: {
    paddingBottom: 15,
  },
  vHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  vHeadText: {
    flex: 1,
    minWidth: 0,
  },
  vBadge: {
    flexShrink: 0,
  },
  vTime: {
    fontSize: 12,
    flexShrink: 0,
  },
  vChildren: {
    marginTop: 9,
    gap: 9,
  },
});
