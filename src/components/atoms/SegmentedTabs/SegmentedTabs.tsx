/**
 * SegmentedTabs — Today / Upcoming / History and friends.
 * Each segment is a real button so TalkBack announces the selected state.
 */

import React from 'react';
import {View, Pressable, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../Text';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: SegmentedTabsProps<T>) {
  const {t, isDark} = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark ? t.surface : t.neutralContainer,
          borderColor: isDark ? t.outline : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}>
      {options.map(option => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            accessibilityLabel={option.label}
            style={[
              styles.segment,
              selected
                ? {backgroundColor: isDark ? t.surfaceElevated : t.surface}
                : null,
            ]}>
            <Text
              style={[
                styles.label,
                {
                  color: selected ? t.textHeading : t.textSecondary,
                  fontWeight: selected ? '700' : '600',
                },
              ]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  label: {
    fontSize: 13,
  },
});
