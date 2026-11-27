/**
 * Auth Service
 * Authentication related API calls
 */

import {apiService} from './api.service';
import {API_ENDPOINTS, OTP_TYPES} from '../constants/api.constants';

export interface SendOTPRequest {
  phone: string;
  otpType: typeof OTP_TYPES[keyof typeof OTP_TYPES];
  userType?: string;
}

export interface SendOTPResponse {
  expiresIn: number;
}

export interface LoginRequest {
  phone: string;
  otpCode: string;
  userType?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    phone: string;
    email: string;
    profileImage?: string;
    isOnline: boolean;
    rating: number;
    totalJobs: number;
    kycStatus: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

class AuthService {
  async sendOTP(data: SendOTPRequest) {
    return apiService.post<SendOTPResponse>(API_ENDPOINTS.SEND_OTP, {
      userType: 'service_partner',
      ...data,
    });
  }

  async verifyOTP(phone: string, otpCode: string, otpType: string) {
    return apiService.post(API_ENDPOINTS.VERIFY_OTP, {
      phone,
      otpCode,
      otpType,
    });
  }

  async login(data: LoginRequest) {
    return apiService.post<LoginResponse>(API_ENDPOINTS.LOGIN, {
      userType: 'service_partner',
      ...data,
    });
  }

  async refreshToken(data: RefreshTokenRequest) {
    return apiService.post<RefreshTokenResponse>(
      API_ENDPOINTS.REFRESH_TOKEN,
      data
    );
  }

  async logout() {
    // Clear token from API service
    apiService.setToken(null);
    return {success: true};
  }

  async forgotPassword(email: string) {
    return apiService.post<{message: string}>(
      API_ENDPOINTS.FORGOT_PASSWORD,
      {email}
    );
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return apiService.post<{message: string}>(
      API_ENDPOINTS.RESET_PASSWORD,
      {email, code, newPassword}
    );
  }

  async registerPartner(formData: FormData) {
    return apiService.postFormData<LoginResponse>(
      API_ENDPOINTS.REGISTER_PARTNER,
      formData
    );
  }
}

export const authService = new AuthService();
