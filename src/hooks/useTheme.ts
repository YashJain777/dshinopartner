import {useColorScheme} from 'react-native';
import {tokens, radii, elevation, Tokens, ThemeScheme} from '../theme/tokens';

export interface ThemeValue {
  /** Semantic design tokens for the active scheme. */
  t: Tokens;
  radii: typeof radii;
  elevation: typeof elevation;
  isDark: boolean;
  scheme: ThemeScheme;
}

export const useTheme = (): ThemeValue => {
  const scheme = useColorScheme();
  const resolved: ThemeScheme = scheme === 'dark' ? 'dark' : 'light';

  return {
    t: tokens[resolved],
    radii,
    elevation,
    isDark: resolved === 'dark',
    scheme: resolved,
  };
};
