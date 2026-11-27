/**
 * ScreenHeader — the header every redesigned screen uses.
 *
 * Deliberately short: the old header ate a fifth of the viewport on a 390pt
 * phone and scrolled nowhere. This one is title + one line of context, with an
 * optional slot underneath for tabs or filter chips.
 */

import React from 'react';
import {View, Pressable, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {numeric, MIN_TOUCH_TARGET} from '../../../theme/textStyles';
import {radii} from '../../../theme/tokens';

export interface ScreenHeaderProps {
  title: string;
  /** One line of context — date, counts, booking number. */
  subtitle?: string;
  /** Subtitle holds digits, so keep the column steady. */
  subtitleNumeric?: boolean;
  onBack?: () => void;
  /** Right-hand control: an icon button, a chip, a text action. */
  right?: React.ReactNode;
  /** Tabs or filter chips, rendered under the title row. */
  children?: React.ReactNode;
  /** `inverse` paints the dark slate header used on the live job. */
  variant?: 'surface' | 'inverse';
  style?: StyleProp<ViewStyle>;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  subtitleNumeric = false,
  onBack,
  right,
  children,
  variant = 'surface',
  style,
}) => {
  const {t} = useTheme();
  const inverse = variant === 'inverse';

  const bg = inverse ? t.surfaceInverse : t.surfaceContainer;
  const titleColour = inverse ? t.textOnInverse : t.textHeading;
  const subColour = inverse ? t.textTertiary : t.textTertiary;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: inverse ? bg : t.surface,
          borderBottomColor: inverse ? bg : t.outline,
        },
        style,
      ]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={[
              styles.back,
              {
                backgroundColor: inverse ? t.surfaceElevated : t.surface,
                borderColor: inverse ? 'transparent' : t.outline,
              },
            ]}>
            <Icon
              name="chevronLeft"
              size={18}
              color={inverse ? t.textPrimary : t.neutralInk}
              strokeWidth={2.2}
            />
          </Pressable>
        ) : null}

        <View style={styles.titles}>
          <Text style={[styles.title, {color: titleColour}]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                subtitleNumeric ? numeric : null,
                styles.subtitle,
                {color: subColour},
              ]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
};

/** Square icon button sized for the header's right slot. */
export const HeaderIconButton: React.FC<{
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress?: () => void;
  badge?: number;
  inverse?: boolean;
}> = ({icon, label, onPress, badge, inverse = false}) => {
  const {t} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      hitSlop={8}
      style={[
        styles.iconButton,
        {
          backgroundColor: inverse ? t.surfaceElevated : t.surface,
          borderColor: inverse ? 'transparent' : t.outline,
        },
      ]}>
      <Icon name={icon} size={20} color={inverse ? t.textPrimary : t.neutralInk} />
      {badge ? (
        <View
          style={[
            styles.badge,
            {backgroundColor: t.danger, borderColor: inverse ? t.surfaceInverse : t.surface},
          ]}>
          <Text style={[numeric, styles.badgeText, {color: t.dangerOnSolid}]}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    flexShrink: 0,
  },
  children: {
    gap: 10,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET - 8,
    height: MIN_TOUCH_TARGET - 8,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
