import React, {memo} from 'react';
import {View, ScrollView} from 'react-native';
import {SafeAreaView, Edges} from 'react-native-safe-area-context';
import {styles} from './ScreenContainer.styles';
import {ScreenContainerProps} from './ScreenContainer.types';
import {useTheme} from '../../../hooks/useTheme';

const DEFAULT_EDGES: Edges = ['top'];

const ScreenContainerComponent: React.FC<ScreenContainerProps> = ({
  children,
  style,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
  backgroundColor,
  scrollable = false,
  showsVerticalScrollIndicator = false,
  refreshControl,
  testID,
}) => {
  const {t} = useTheme();
  // Defaults to the themed surface so a screen that forgets the prop still
  // follows dark mode instead of flashing white.
  const customSafeAreaStyle = [
    styles.safeArea,
    {backgroundColor: backgroundColor ?? t.surfaceContainer},
  ];

  if (scrollable) {
    return (
      <SafeAreaView style={customSafeAreaStyle} edges={edges} testID={testID}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={customSafeAreaStyle} edges={edges} testID={testID}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
};

export const ScreenContainer = memo(ScreenContainerComponent);

export type {ScreenContainerProps} from './ScreenContainer.types';
