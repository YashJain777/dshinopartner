/**
 * KYC API Service
 * Handles KYC status, bank details submission, and document uploads
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {KYCStatusResponse, SubmitKYCDetailsRequest, DocumentType} from '../../types/api.types';

/**
 * Get KYC and Onboarding status (including details and document status)
 */
export const getKycStatus = async (): Promise<KYCStatusResponse> => {
  const response = await apiClient.get<ApiResponse<KYCStatusResponse>>(
    API_ENDPOINTS.KYC_STATUS,
  );
  return response.data.data;
};

/**
 * Submit / Update KYC details (including Bank details and ID numbers)
 */
export const submitKycDetails = async (
  data: Partial<SubmitKYCDetailsRequest>,
): Promise<{success: boolean; message: string; data: Partial<SubmitKYCDetailsRequest>}> => {
  const response = await apiClient.patch<
    ApiResponse<{success: boolean; message: string; data: Partial<SubmitKYCDetailsRequest>}>
  >(API_ENDPOINTS.SUBMIT_KYC_DETAILS, data);
  return response.data.data;
};

/**
 * Upload a single KYC document image
 * documentType must be one of: AADHAAR_FRONT | AADHAAR_BACK | PAN | SELFIE | BANK_PASSBOOK | ADDRESS_PROOF | DRIVING_LICENSE
 */
export const uploadKycDocument = async (
  imageUri: string,
  documentType: DocumentType,
): Promise<any> => {
  const formData = new FormData();
  formData.append('document', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `${documentType.toLowerCase()}_${Date.now()}.jpg`,
  } as any);
  formData.append('documentType', documentType);

  const response = await apiClient.post<ApiResponse<any>>(
    API_ENDPOINTS.UPLOAD_KYC_DOCUMENT,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data.data;
};
