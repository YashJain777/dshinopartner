/**
 * Splash Screen Types
 */

export interface SplashScreenProps {
  /**
   * Callback when splash screen completes
   */
  onComplete?: () => void;

  /**
   * Duration to show splash screen (ms)
   * @default 3000
   */
  duration?: number;
}

export interface SplashSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: any | null; // ImageSourcePropType or null for placeholder
  backgroundColor: string;
  textColor: string;
}
