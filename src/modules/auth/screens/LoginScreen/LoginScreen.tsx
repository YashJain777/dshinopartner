/**
 * Login — phone, then the OTP.
 *
 * One screen, two steps: the number collapses to a summary row once the code
 * is on its way, so the partner never loses sight of which number they used.
 * A six-digit code submits itself; typing it and then hunting for a button is
 * wasted effort on a phone held in one hand at a customer's gate.
 *
 * The code goes into digit boxes, not a text field with a "------" hint — the
 * boxes show at a glance how many digits are in and how many are left, which
 * a single field cannot.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Pressable, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {TextField} from '../../../../components/atoms/TextField';
import {OtpBoxes} from '../../../../components/atoms/OtpBoxes';
import {AuthLayout, authTokens as t} from '../../../../components/molecules/AuthLayout';
import {useAuthStore} from '../../../../store/auth.store';
import {LoginScreenProps} from './LoginScreen.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export const LoginScreen: React.FC<LoginScreenProps & {navigation?: any}> = ({
  navigation,
  onLoginSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const lastSubmittedOtp = useRef('');
  const {sendOTP, login, isLoading, error, clearError, otpForTesting} = useAuthStore();

  const isValidPhone = phoneNumber.length === PHONE_LENGTH;
  const isValidOtp = otp.length === OTP_LENGTH;
  const fullPhone = `${countryCode}${phoneNumber}`;

  useEffect(() => {
    if (error) {
      Alert.alert('Could not sign in', error, [{text: 'OK', onPress: () => clearError()}]);
    }
  }, [error, clearError]);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleSendOTP = useCallback(async () => {
    if (!isValidPhone) {
      return;
    }
    try {
      const result = await sendOTP(fullPhone);
      if (result.success) {
        setOtpSent(true);
        setOtp('');
        lastSubmittedOtp.current = '';
        setResendIn(RESEND_SECONDS);
      } else {
        Alert.alert(
          'Could not send the code',
          result.error || 'Please check the number and try again.',
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Could not send the code',
        err?.response?.data?.message || err?.message || 'Please try again.',
      );
    }
  }, [fullPhone, isValidPhone, sendOTP]);

  const handleLogin = useCallback(
    async (customOtp?: string) => {
      const otpToUse = customOtp ?? otp;
      if (otpToUse.length !== OTP_LENGTH) {
        return;
      }
      try {
        const result = await login(fullPhone, otpToUse);
        if (result.success) {
          onLoginSuccess?.({phone: fullPhone});
        } else {
          Alert.alert('Could not sign in', result.error || 'That code did not match.');
        }
      } catch (err: any) {
        Alert.alert(
          'Could not sign in',
          err?.response?.data?.message || err?.message || 'Please try again.',
        );
      }
    },
    [fullPhone, login, onLoginSuccess, otp],
  );

  // Six digits is the whole code — submit without asking.
  useEffect(() => {
    if (otpSent && isValidOtp && !isLoading && otp !== lastSubmittedOtp.current) {
      lastSubmittedOtp.current = otp;
      handleLogin(otp);
    } else if (otp.length < OTP_LENGTH) {
      lastSubmittedOtp.current = '';
    }
  }, [otp, otpSent, isLoading, isValidOtp, handleLogin]);

  const editNumber = () => {
    setOtpSent(false);
    setOtp('');
    setResendIn(0);
  };

  const primaryDisabled = otpSent ? !isValidOtp || isLoading : !isValidPhone || isLoading;

  return (
    <AuthLayout
      showBrand
      title={otpSent ? 'Enter the code' : 'Sign in'}
      subtitle={
        otpSent
          ? `We sent a ${OTP_LENGTH}-digit code by SMS.`
          : 'Use the number your agency registered for you.'
      }
      onBack={otpSent ? editNumber : undefined}
      footer={
        <>
          <Pressable
            onPress={() => (otpSent ? handleLogin() : handleSendOTP())}
            disabled={primaryDisabled}
            accessibilityRole="button"
            accessibilityState={{disabled: primaryDisabled}}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: primaryDisabled ? t.surfaceElevated : t.brandAction,
              },
            ]}>
            {isLoading ? (
              <ActivityIndicator size="small" color={t.brandActionText} />
            ) : (
              <Text
                style={[
                  styles.primaryText,
                  {color: primaryDisabled ? t.textDisabled : t.brandActionText},
                ]}>
                {otpSent ? 'Verify & continue' : 'Send the code'}
              </Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            {otpSent ? (
              <Pressable
                onPress={handleSendOTP}
                disabled={resendIn > 0 || isLoading}
                accessibilityRole="button"
                hitSlop={8}>
                <Text
                  style={[
                    numeric,
                    styles.linkText,
                    {color: resendIn > 0 ? t.textDisabled : t.brandInk},
                  ]}>
                  {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, '0')}` : 'Resend the code'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => navigation?.navigate('Signup')}
                accessibilityRole="button"
                hitSlop={8}>
                <Text style={[styles.linkText, {color: t.brandInk}]}>
                  Register as a partner
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => navigation?.navigate('ForgotPassword')}
              accessibilityRole="button"
              hitSlop={8}>
              <Text style={[styles.linkText, {color: t.textTertiary}]}>
                Use password
              </Text>
            </Pressable>
          </View>
        </>
      }>
      {otpSent ? (
        <>
          {/* The number collapses to a summary the partner can correct. */}
          <View style={[styles.summary, {backgroundColor: t.surfaceElevated}]}>
            <Icon name="phone" size={17} color={t.textTertiary} strokeWidth={1.9} />
            <Text style={[numeric, styles.summaryText, {color: t.textPrimary}]}>
              {countryCode} {phoneNumber}
            </Text>
            <Pressable onPress={editNumber} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.summaryEdit, {color: t.brandInk}]}>Change</Text>
            </Pressable>
          </View>

          <OtpBoxes
            value={otp}
            onChangeText={setOtp}
            length={OTP_LENGTH}
            autoFocus
            disabled={isLoading}
            accessibilityLabel="SMS verification code"
            palette={t}
          />

          <Text style={[styles.otpHint, {color: t.textTertiary}]}>
            {isLoading
              ? 'Checking the code…'
              : isValidOtp
              ? 'Checking…'
              : 'Reading the SMS automatically…'}
          </Text>

          {otpForTesting ? (
            <View style={[styles.devHint, {backgroundColor: t.warningContainer}]}>
              <Icon name="info" size={15} color={t.warningInk} strokeWidth={2} />
              <Text style={[numeric, styles.devHintText, {color: t.warningInk}]}>
                Test code: {otpForTesting}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <TextField
          label="Mobile number"
          value={phoneNumber}
          onChangeText={v => setPhoneNumber(v.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
          placeholder="98290 41187"
          keyboardType="number-pad"
          maxLength={PHONE_LENGTH}
          autoFocus
          tabular
          prefix={countryCode}
          hint={
            isValidPhone
              ? 'A code will arrive by SMS'
              : `${phoneNumber.length} of ${PHONE_LENGTH} digits`
          }
          returnKeyType="send"
          onSubmitEditing={handleSendOTP}
        />
      )}

      <View style={[styles.note, {backgroundColor: t.surfaceElevated}]}>
        <Icon name="shield" size={16} color={t.textTertiary} strokeWidth={1.9} />
        <Text style={[styles.noteText, {color: t.textSecondary}]}>
          Dshino never asks for your OTP on a call. If someone does, hang up and tell
          your agency.
        </Text>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  summaryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryEdit: {
    fontSize: 13,
    fontWeight: '700',
  },
  otpHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  devHintText: {
    fontSize: 12,
    fontWeight: '700',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
