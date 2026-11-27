/**
 * Payout Pre-flight Eligibility Guard
 * Prevents 400 Bad Request errors by validating KYC & Bank Details before payout submission
 */

import { KYCStatusResponse } from '../types/api.types';

export interface PayoutEligibilityResult {
  eligible: boolean;
  title?: string;
  message?: string;
  missingType?: 'BANK' | 'KYC' | 'BALANCE';
}

export const checkPayoutEligibility = (
  kyc: KYCStatusResponse | null,
  balance: number,
): PayoutEligibilityResult => {
  if (!kyc) {
    return {
      eligible: false,
      title: 'Verification Required',
      message: 'Unable to verify your KYC status. Please check your Profile.',
      missingType: 'KYC',
    };
  }

  const { bankAccountNumber, ifscCode, accountHolderName } = kyc.textDetails || {};
  if (!bankAccountNumber || !ifscCode || !accountHolderName) {
    return {
      eligible: false,
      title: 'Bank Details Required',
      message:
        'Please complete your bank account details in Profile before requesting a payout.',
      missingType: 'BANK',
    };
  }

  const status = String(kyc.overallKycStatus || '').toUpperCase();
  if (status !== 'APPROVED' && status !== 'VERIFIED') {
    return {
      eligible: false,
      title: 'KYC Approval Pending',
      message:
        'Your KYC documents must be approved before you can withdraw funds.',
      missingType: 'KYC',
    };
  }

  if (balance <= 0) {
    return {
      eligible: false,
      title: 'No Funds Available',
      message: 'Your available wallet balance must be greater than ₹0.',
      missingType: 'BALANCE',
    };
  }

  return { eligible: true };
};
