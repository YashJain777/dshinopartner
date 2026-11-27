/**
 * KYC documents.
 *
 * Rejected documents are pulled to the top with their reason: they are the
 * only rows that need action, and burying them in a list of seven is how a
 * payout stays blocked for a week.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Pressable, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../../components/atoms/Icon';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {getKycStatus, uploadKycDocument} from '../../../../../services/api/kyc.api';
import {showImagePickerOptions} from '../../../../../utils/camera.utils';
import {ChecklistItem, DocumentType} from '../../../../../types/api.types';
import {logger} from '../../../../../utils/logger';
import {radii} from '../../../../../theme/tokens';

export interface KycDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  onKycStatusChange?: (status: string) => void;
}

const docIcon = (docType: string): IconName => {
  if (docType.startsWith('AADHAAR')) {
    return 'idCard';
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

/** Rejected first, then missing, then in review, then approved. */
const ORDER: Record<string, number> = {
  REJECTED: 0,
  NOT_SUBMITTED: 1,
  PENDING: 2,
  APPROVED: 3,
};

export const KycDocumentsModal: React.FC<KycDocumentsModalProps> = ({
  visible,
  onClose,
  onKycStatusChange,
}) => {
  const {t} = useTheme();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const onChangeRef = useRef(onKycStatusChange);
  useEffect(() => {
    onChangeRef.current = onKycStatusChange;
  }, [onKycStatusChange]);

  const fetchKycInfo = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await getKycStatus();
      setChecklist(data.checklist || []);
      setLabels(data.documentLabels || {});
      onChangeRef.current?.(data.overallKycStatus);
    } catch (err) {
      logger.error('[KYC] Status fetch failed', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchKycInfo(true);
    }
  }, [visible, fetchKycInfo]);

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

  const sorted = useMemo(
    () =>
      [...checklist].sort(
        (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
      ),
    [checklist],
  );

  const approved = checklist.filter(d => d.status === 'APPROVED').length;
  const needsAction = checklist.filter(d => d.status === 'REJECTED').length;

  const tone = (status: string) => {
    if (status === 'APPROVED') {
      return {bg: t.successContainer, fg: t.successInk, label: 'Approved'};
    }
    if (status === 'PENDING') {
      return {bg: t.warningContainer, fg: t.warningInk, label: 'In review'};
    }
    if (status === 'REJECTED') {
      return {bg: t.dangerContainer, fg: t.dangerInk, label: 'Re-upload'};
    }
    return {bg: t.neutralContainer, fg: t.textTertiary, label: 'Not uploaded'};
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Your documents"
      subtitle={
        checklist.length
          ? `${approved} of ${checklist.length} approved${
              needsAction ? ` · ${needsAction} need action` : ''
            }`
          : undefined
      }
      icon="idCard"
      iconTone={needsAction ? 'danger' : 'brand'}
      scrollable
      primaryAction={{label: 'Done', onPress: onClose, tone: 'neutral'}}>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="small" color={t.brandAction} />
      ) : (
        <>
          {checklist.length ? (
            <View style={styles.progress}>
              {sorted.map(doc => (
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
                          : t.outline,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          {sorted.map(doc => {
            const palette = tone(doc.status);
            const busy = uploadingDoc === doc.documentType;
            const label = labels[doc.documentType] ?? doc.documentType;

            return (
              <Pressable
                key={doc.documentType}
                onPress={() => handleUpload(doc.documentType)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${palette.label}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: t.surfaceContainer,
                    borderColor:
                      doc.status === 'REJECTED' ? t.dangerBorder : t.outline,
                  },
                ]}>
                <View style={[styles.icon, {backgroundColor: palette.bg}]}>
                  {busy ? (
                    <ActivityIndicator size="small" color={palette.fg} />
                  ) : (
                    <Icon
                      name={docIcon(doc.documentType)}
                      size={18}
                      color={palette.fg}
                      strokeWidth={1.9}
                    />
                  )}
                </View>
                <View style={styles.text}>
                  <Text style={[styles.label, {color: t.textHeading}]}>{label}</Text>
                  <Text style={[styles.status, {color: palette.fg}]}>
                    {doc.status === 'REJECTED'
                      ? 'Rejected — tap to upload a clearer photo'
                      : palette.label}
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

          <Text style={[styles.note, {color: t.textTertiary}]}>
            Re-uploading replaces the old image and sends it back for review.
          </Text>
        </>
      )}
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 40,
  },
  progress: {
    flexDirection: 'row',
    gap: 5,
  },
  progressSeg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
