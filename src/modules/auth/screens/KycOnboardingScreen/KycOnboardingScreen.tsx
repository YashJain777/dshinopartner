/**
 * KYC onboarding — numbers first, then the documents.
 *
 * Every format rule here is the backend's: 12-digit Aadhaar, the PAN pattern,
 * the IFSC pattern. They validate as the partner types rather than after a
 * rejected submit, because retyping a bank account number from an alert is
 * how people give up on onboarding.
 *
 * Step 2 is a live checklist from the server, so a rejected document says so
 * and can be replaced in place.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Pressable, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../components/atoms/Icon';
import {TextField} from '../../../../components/atoms/TextField';
import {AuthLayout, authTokens as t} from '../../../../components/molecules/AuthLayout';
import {
  getKycStatus,
  submitKycDetails,
  uploadKycDocument,
} from '../../../../services/api/kyc.api';
import {showImagePickerOptions} from '../../../../utils/camera.utils';
import {DocumentType} from '../../../../types/api.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

interface ChecklistItem {
  documentType: DocumentType;
  status: string;
}

const docIcon = (docType: string): IconName => {
  if (docType.startsWith('AADHAAR')) {
    return 'idCard';
  }
  if (docType === 'PAN') {
    return 'document';
  }
  if (docType === 'DRIVING_LICENSE') {
    return 'car';
  }
  if (docType === 'SELFIE') {
    return 'user';
  }
  if (docType === 'BANK_PASSBOOK') {
    return 'bank';
  }
  return 'document';
};

interface KycOnboardingScreenProps {
  /**
   * This screen is rendered by RootNavigator as a gate, outside the stack, so
   * it reports completion through a callback rather than navigating.
   */
  onComplete?: () => void;
  navigation?: any;
}

export const KycOnboardingScreen: React.FC<KycOnboardingScreenProps> = ({
  onComplete,
  navigation,
}) => {
  const leave = () => {
    if (onComplete) {
      onComplete();
      return;
    }
    navigation?.goBack?.();
  };
  const [step, setStep] = useState(1);

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documentLabels, setDocumentLabels] = useState<Record<string, string>>({});
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill anything already saved, so a partner resuming does not retype.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getKycStatus();
        const d = res.textDetails;
        if (d) {
          if (d.aadhaarNumber) setAadhaarNumber(d.aadhaarNumber);
          if (d.panNumber) setPanNumber(d.panNumber);
          if (d.accountHolderName) setAccountHolderName(d.accountHolderName);
          if (d.bankAccountNumber) setBankAccountNumber(d.bankAccountNumber);
          if (d.ifscCode) setIfscCode(d.ifscCode);
          if (d.drivingLicenseNumber) setDrivingLicenseNumber(d.drivingLicenseNumber);
        }
      } catch (err) {
        console.warn('Failed to pre-load KYC data:', err);
      }
    };
    load();
  }, []);

  const fetchKycInfo = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingChecklist(true);
      }
      const data = await getKycStatus();
      setChecklist((data.checklist ?? []) as ChecklistItem[]);
      setDocumentLabels(data.documentLabels ?? {});
    } catch (err) {
      console.error('Failed to fetch KYC status:', err);
    } finally {
      if (showLoading) {
        setLoadingChecklist(false);
      }
    }
  }, []);

  // ─── Field validation, mirroring the backend ───────────────────────────────

  const errors = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    if (aadhaarNumber && aadhaarNumber.length !== 12) {
      out.aadhaar = 'Aadhaar is 12 digits';
    }
    if (panNumber && !PAN_RE.test(panNumber)) {
      out.pan = 'Format: ABCDE1234F';
    }
    if (bankAccountNumber && bankAccountNumber.length < 8) {
      out.account = 'That looks too short for an account number';
    }
    if (ifscCode && !IFSC_RE.test(ifscCode)) {
      out.ifsc = 'Format: SBIN0001234';
    }
    return out;
  }, [aadhaarNumber, panNumber, bankAccountNumber, ifscCode]);

  const detailsComplete =
    aadhaarNumber.length === 12 &&
    PAN_RE.test(panNumber) &&
    accountHolderName.trim().length > 1 &&
    bankAccountNumber.trim().length >= 8 &&
    IFSC_RE.test(ifscCode);

  const handleSaveDetails = async () => {
    if (!detailsComplete) {
      return;
    }
    setSubmitting(true);
    try {
      await submitKycDetails({
        aadhaarNumber,
        panNumber,
        accountHolderName: accountHolderName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        ifscCode,
        drivingLicenseNumber: drivingLicenseNumber.trim() || undefined,
      });
      await fetchKycInfo(true);
      setStep(2);
    } catch (err: any) {
      Alert.alert('Could not save', err?.message || 'Please check your network.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (docType: DocumentType) => {
    try {
      const uri = await showImagePickerOptions('document');
      if (!uri) {
        return;
      }
      setUploadingDoc(docType);
      await uploadKycDocument(uri, docType);
      await fetchKycInfo(false);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload that document.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const approved = checklist.filter(d => d.status === 'APPROVED').length;
  const allUploaded = checklist.every(d => d.status !== 'NOT_SUBMITTED');
  /**
   * Uploading is not the same as being let in.
   *
   * The account stays suspended until an admin approves every document, so a
   * partner who has uploaded all four still cannot use the app. The button
   * said "Done" at that point and dropped them into tabs where every request
   * failed, which read as the button doing nothing. It now only claims Done
   * once the server agrees.
   */
  const allApproved =
    checklist.length > 0 && checklist.every(d => d.status === 'APPROVED');
  const awaitingReview = allUploaded && !allApproved;

  return (
    <AuthLayout
      showBrand={step === 1}
      title={step === 1 ? 'Your details' : 'Upload your documents'}
      subtitle={
        step === 1
          ? 'These must match your documents exactly — payouts go to this account.'
          : `${approved} of ${checklist.length || 7} approved. You can keep working while they are reviewed.`
      }
      step={{current: step, total: 2}}
      onBack={step > 1 ? () => setStep(1) : navigation ? () => navigation.goBack() : undefined}
      footer={
        step === 1 ? (
          <Pressable
            onPress={handleSaveDetails}
            disabled={!detailsComplete || submitting}
            accessibilityRole="button"
            accessibilityState={{disabled: !detailsComplete || submitting}}
            style={[
              styles.primaryBtn,
              {backgroundColor: detailsComplete ? t.brandAction : t.surfaceElevated},
            ]}>
            {submitting ? (
              <ActivityIndicator size="small" color={t.brandActionText} />
            ) : (
              <Text
                style={[
                  styles.primaryText,
                  {color: detailsComplete ? t.brandActionText : t.textDisabled},
                ]}>
                Save and continue
              </Text>
            )}
          </Pressable>
        ) : (
          <>
            {awaitingReview ? (
              <View
                style={[styles.reviewNote, {backgroundColor: t.warningContainer}]}>
                <Icon name="clock" size={16} color={t.warningInk} strokeWidth={2} />
                <Text style={[styles.reviewNoteText, {color: t.warningInk}]}>
                  All documents are in. Your agency reviews them before you can
                  take jobs — usually within a day. You will get a notification.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={leave}
              accessibilityRole="button"
              style={[
                styles.primaryBtn,
                {backgroundColor: allApproved ? t.brandAction : t.surfaceElevated},
              ]}>
              <Text
                style={[
                  styles.primaryText,
                  {color: allApproved ? t.brandActionText : t.textPrimary},
                ]}>
                {allApproved ? 'Done' : awaitingReview ? 'Check status' : 'Finish later'}
              </Text>
            </Pressable>
            <Text style={[styles.footerNote, {color: t.textTertiary}]}>
              Re-uploading a document sends it back for review.
            </Text>
          </>
        )
      }>
      {step === 1 ? (
        <>
          <TextField
            label="Aadhaar number"
            value={aadhaarNumber}
            onChangeText={v => setAadhaarNumber(v.replace(/\D/g, '').slice(0, 12))}
            placeholder="12 digits"
            keyboardType="number-pad"
            maxLength={12}
            tabular
            leftIcon="idCard"
            error={errors.aadhaar}
          />

          <TextField
            label="PAN number"
            value={panNumber}
            onChangeText={v => setPanNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            tabular
            leftIcon="document"
            error={errors.pan}
          />

          <TextField
            label="Driving licence (optional)"
            value={drivingLicenseNumber}
            onChangeText={setDrivingLicenseNumber}
            placeholder="If you have one"
            autoCapitalize="characters"
            autoCorrect={false}
            tabular
            leftIcon="car"
          />

          <View style={[styles.sectionRule, {backgroundColor: t.outline}]} />

          <TextField
            label="Account holder name"
            value={accountHolderName}
            onChangeText={setAccountHolderName}
            placeholder="Exactly as on your passbook"
            autoCapitalize="words"
            leftIcon="user"
          />

          <TextField
            label="Bank account number"
            value={bankAccountNumber}
            onChangeText={v => setBankAccountNumber(v.replace(/\D/g, '').slice(0, 20))}
            placeholder="Your account number"
            keyboardType="number-pad"
            maxLength={20}
            tabular
            leftIcon="bank"
            error={errors.account}
          />

          <TextField
            label="IFSC code"
            value={ifscCode}
            onChangeText={v => setIfscCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
            placeholder="SBIN0001234"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
            tabular
            leftIcon="bank"
            error={errors.ifsc}
          />

          <View style={[styles.note, {backgroundColor: t.surfaceElevated}]}>
            <Icon name="shield" size={16} color={t.textTertiary} strokeWidth={1.9} />
            <Text style={[styles.noteText, {color: t.textSecondary}]}>
              Payouts land in this account. A mismatch between the name here and your
              passbook is the most common reason a payout is held.
            </Text>
          </View>
        </>
      ) : loadingChecklist ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={t.brand} />
          <Text style={[styles.loadingText, {color: t.textTertiary}]}>
            Loading your documents…
          </Text>
        </View>
      ) : (
        <>
          {checklist.map(doc => {
            const label = documentLabels[doc.documentType] ?? doc.documentType;
            const busy = uploadingDoc === doc.documentType;

            const tone =
              doc.status === 'APPROVED'
                ? {bg: t.successContainer, fg: t.successInk, text: 'Approved'}
                : doc.status === 'REJECTED'
                ? {bg: t.dangerContainer, fg: t.dangerInk, text: 'Re-upload'}
                : doc.status === 'PENDING'
                ? {bg: t.warningContainer, fg: t.warningInk, text: 'In review'}
                : {bg: t.surfaceElevated, fg: t.textTertiary, text: 'Not uploaded'};

            return (
              <Pressable
                key={doc.documentType}
                onPress={() => handleUpload(doc.documentType)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${tone.text}`}
                style={[
                  styles.docRow,
                  {
                    backgroundColor: t.surfaceContainer,
                    borderColor:
                      doc.status === 'REJECTED' ? t.dangerBorder : t.outline,
                  },
                ]}>
                <View style={[styles.docIcon, {backgroundColor: tone.bg}]}>
                  {busy ? (
                    <ActivityIndicator size="small" color={tone.fg} />
                  ) : (
                    <Icon
                      name={docIcon(doc.documentType)}
                      size={18}
                      color={tone.fg}
                      strokeWidth={1.9}
                    />
                  )}
                </View>

                <View style={styles.docText}>
                  <Text style={[styles.docLabel, {color: t.textHeading}]}>{label}</Text>
                  <Text style={[styles.docStatus, {color: tone.fg}]}>
                    {doc.status === 'REJECTED'
                      ? 'Rejected — upload a clearer photo'
                      : tone.text}
                  </Text>
                </View>

                <Icon
                  name={doc.status === 'APPROVED' ? 'check' : 'arrowUp'}
                  size={17}
                  color={doc.status === 'APPROVED' ? t.success : t.textTertiary}
                  strokeWidth={2.2}
                />
              </Pressable>
            );
          })}

          {checklist.length ? (
            <View style={styles.progressRow}>
              {checklist.map(doc => (
                <View
                  key={doc.documentType}
                  style={[
                    styles.progressSeg,
                    {
                      backgroundColor:
                        doc.status === 'APPROVED'
                          ? t.success
                          : doc.status === 'PENDING'
                          ? t.warning
                          : doc.status === 'REJECTED'
                          ? t.danger
                          : t.surfaceElevated,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={[styles.note, {backgroundColor: t.surfaceElevated}]}>
            <Icon name="info" size={16} color={t.textTertiary} strokeWidth={1.9} />
            <Text style={[numeric, styles.noteText, {color: t.textSecondary}]}>
              You can start taking jobs before these clear. Only payouts wait.
            </Text>
          </View>
        </>
      )}
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  reviewNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  reviewNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionRule: {
    height: 1,
    marginVertical: 2,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  loading: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 36,
  },
  loadingText: {
    fontSize: 13,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  docStatus: {
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressSeg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 4,
  },
});
