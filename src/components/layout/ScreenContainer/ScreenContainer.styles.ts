import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    // Colour comes from the component, which reads the active theme.
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
