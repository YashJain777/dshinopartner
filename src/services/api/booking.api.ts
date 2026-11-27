/**
 * Booking API Service
 * Handles all booking/job-related API calls
 */

import apiClient, {ApiResponse, replaceUrlParams} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {Booking} from '../../types/api.types';

/**
 * Get active booking
 */
export const getActiveBooking = async (): Promise<Booking | null> => {
  const response = await apiClient.get<ApiResponse<Booking | null>>(
    API_ENDPOINTS.ACTIVE_BOOKING,
  );
  return response.data.data;
};

/**
 * Get booking details by ID
 */
export const getBookingDetails = async (bookingId: string): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.BOOKING_DETAILS, {id: bookingId});
  const response = await apiClient.get<ApiResponse<Booking>>(url);
  return response.data.data;
};

/**
 * Get booking history with pagination
 */
export interface GetBookingsParams {
  page?: number;
  limit?: number;
  /** One or more booking statuses, comma-separated. */
  status?: string;
}

export interface BookingsPage {
  bookings: Booking[];
  /** Total matching the filter, across all pages. */
  total: number;
}

export const getBookings = async (
  params: GetBookingsParams = {},
): Promise<BookingsPage> => {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.BOOKINGS,
    {params},
  );
  const payload = response.data?.data;

  // The paginated endpoint returns { data, pagination }. An older deployment
  // returns the array directly, and reading `.data` off an array silently
  // yields an empty history instead of an error — so accept both shapes.
  const bookings: Booking[] = Array.isArray(payload) ? payload : payload?.data ?? [];

  return {
    bookings,
    total: Number(payload?.pagination?.total ?? bookings.length),
  };
};

/**
 * Update booking status
 */
export interface UpdateBookingStatusData {
  status: 'EN_ROUTE' | 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';
  otp?: string;
  lat?: number;
  lng?: number;
}

export const updateBookingStatus = async (
  bookingId: string,
  data: UpdateBookingStatusData,
): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.UPDATE_BOOKING_STATUS, {
    bookingId: bookingId,
  });
  const response = await apiClient.patch<ApiResponse<Booking>>(url, data);
  return response.data.data;
};

/**
 * Upload job photos (before/after)
 */
export interface UploadPhotosData {
  photos: {uri: string; type: string; name: string}[];
  type: 'BEFORE' | 'AFTER';
}

export const uploadJobPhotos = async (
  bookingId: string,
  photoUri: string,
  type: 'BEFORE' | 'AFTER',
): Promise<Booking> => {
  const formData = new FormData();
  formData.append('photos', {
    uri: photoUri,
    type: 'image/jpeg',
    name: `${type.toLowerCase()}_${Date.now()}.jpg`,
  } as any);
  
  // Send both 'type' and 'photoType' to support different backend controller expectations
  formData.append('type', type); // 'BEFORE' | 'AFTER'
  formData.append('photoType', type.toLowerCase()); // 'before' | 'after'

  const url = replaceUrlParams(API_ENDPOINTS.UPLOAD_BOOKING_PHOTOS, {
    id: bookingId,
  });

  const response = await apiClient.post<ApiResponse<Booking>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

/**
 * Complete booking with OTP
 */
export interface CompleteBookingData {
  otp: string;
}

export const completeBooking = async (
  bookingId: string,
  data: CompleteBookingData,
): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.COMPLETE_BOOKING, {
    bookingId: bookingId,
  });
  const response = await apiClient.post<ApiResponse<Booking>>(url, data);
  return response.data.data;
};

/**
 * Acknowledge booking schedule update
 */
export const acknowledgeBooking = async (
  bookingId: string,
): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.ACKNOWLEDGE_BOOKING, {
    bookingId,
  });
  const response = await apiClient.post<ApiResponse<Booking>>(url);
  return response.data.data;
};

/**
 * Mark arrival at booking location
 */
export interface ArriveBookingData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const arriveBooking = async (
  bookingId: string,
  coords?: ArriveBookingData,
): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.ARRIVE_BOOKING, {id: bookingId});
  // The server geofences the arrival against these coordinates and validates
  // the body strictly, so send the contract's fields only. The caller passes a
  // device location object that carries extra fields, and forwarding it as-is
  // fails validation.
  const payload = coords
    ? {lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy}
    : {};
  const response = await apiClient.post<ApiResponse<Booking>>(url, payload);
  return response.data.data;
};

/**
 * Raise issue with booking
 */
export interface RaiseIssueData {
  issueType:
    | 'CUSTOMER_ABSENT'
    | 'VEHICLE_NOT_ACCESSIBLE'
    | 'SAFETY_CONCERN'
    | 'EQUIPMENT_FAILURE'
    | 'WRONG_ADDRESS'
    | 'CUSTOMER_HOSTILE'
    | 'OTHER';
  description: string;
}

export const raiseBookingIssue = async (
  bookingId: string,
  data: RaiseIssueData,
): Promise<Booking> => {
  const url = replaceUrlParams(API_ENDPOINTS.RAISE_BOOKING_ISSUE, {
    id: bookingId,
  });
  const response = await apiClient.post<ApiResponse<Booking>>(url, data);
  return response.data.data;
};

/**
 * Trigger SOS emergency
 */
export const triggerSOS = async (
  lat?: number,
  lng?: number,
  bookingId?: string,
): Promise<{success: boolean; message: string}> => {
  const response = await apiClient.post<ApiResponse<{success: boolean; message: string}>>(
    API_ENDPOINTS.SOS_EMERGENCY,
    {lat, lng, bookingId},
  );
  return response.data.data;
};

