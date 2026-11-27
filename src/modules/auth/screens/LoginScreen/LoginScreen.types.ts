/**
 * Login Screen Types
 */

export interface LoginScreenProps {
  onLoginSuccess?: (data: LoginSuccessData) => void;
  onNavigateToHelp?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

export interface LoginSuccessData {
  phone: string;
  userId?: string;
}

export interface PhoneInputData {
  countryCode: string;
  phoneNumber: string;
}
