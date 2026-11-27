/**
 * Terms & conditions.
 *
 * Pulled from the CMS so legal can change it without a release; the bundled
 * copy below is only a fallback for when that call fails.
 */

import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {getCmsPage} from '../../../../../services/api/cms.api';

export interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

const FALLBACK_TERMS = `
Last Updated: June 2026

Welcome to Shine Auto Care (DShino) Service Partner Program. Please read these Terms and Conditions carefully before using the app or providing services.

1. ACCEPTANCE OF TERMS
By registering as a Service Partner, you agree to be bound by these Terms. If you do not agree, please do not complete registration or use the platform.

2. SERVICE PARTNER OBLIGATIONS
- You must perform auto care services with professional care, safety standards, and diligence.
- You must maintain active availability during agreed slots and respond to assigned bookings within the response window.
- You agree to utilize only approved cleaning supplies and equipment.

3. COMMISSIONS AND PAYOUTS
- Shine Auto Care will collect customer payments on your behalf.
- The standard platform commission rate will be deducted from booking amounts.
- You may request payouts of your cleared wallet balance to your registered bank account according to standard settlement windows.

4. CONDUCT AND DISCIPLINE
- Service partners must maintain a minimum performance rating of 4.5.
- Failure to comply with safety checklists or customer service standards may result in temporary suspension or permanent deactivation of your account.
`;

export const TermsModal: React.FC<TermsModalProps> = ({visible, onClose}) => {
  const {t} = useTheme();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Terms & conditions');
  const [loading, setLoading] = useState(true);
  const [fromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!visible) {
        return;
      }
      try {
        setLoading(true);
        const data = await getCmsPage('terms-and-conditions');
        if (data?.content) {
          setContent(data.content);
          setTitle(data.title || 'Terms & conditions');
          setFromFallback(false);
        } else {
          setContent(FALLBACK_TERMS);
          setFromFallback(true);
        }
      } catch (err) {
        console.warn('Failed to load terms from CMS API, using fallback:', err);
        setContent(FALLBACK_TERMS);
        setFromFallback(true);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [visible]);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={fromFallback ? 'Offline copy — may not be the latest' : undefined}
      icon="document"
      scrollable
      primaryAction={{label: 'Close', onPress: onClose, tone: 'neutral'}}>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="small" color={t.brandAction} />
      ) : (
        <Text style={[styles.body, {color: t.textSecondary}]}>{content.trim()}</Text>
      )}
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 40,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
});
