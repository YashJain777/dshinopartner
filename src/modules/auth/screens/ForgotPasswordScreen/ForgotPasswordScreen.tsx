/**
 * Forgot password — ask for the reset code.
 *
 * Validation runs as the partner types rather than on submit, so the button
 * only lights up when the email can actually be sent.
 */

import React, {useMemo, useState} from 'react';
import {View, Pressable, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {TextField} from '../../../../components/atoms/TextField';
import {AuthLayout, authTokens as t} from '../../../../components/molecules/AuthLayout';
import {authService} from '../../../../services/auth.service';
import {ForgotPasswordScreenProps} from './ForgotPasswordScreen.types';
import {radii} from '../../../../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);
  const error = useMemo(() => {
    if (!touched || !trimmed) {
      return undefined;
    }
    return valid ? undefined : 'That does not look like an email address';
  }, [touched, trimmed, valid]);

  const handleSendCode = async () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    try {
      setLoading(true);
      const response = await authService.forgotPassword(trimmed);
      if (response.success) {
        navigation.navigate('ResetPassword', {email: trimmed});
      } else {
        Alert.alert(
          'Could not send the code',
          response.error?.message || 'Please try again.',
        );
      }
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email a code to the address your agency registered."
      onBack={() => navigation.goBack()}
      footer={
        <>
          <Pressable
            onPress={handleSendCode}
            disabled={!valid || loading}
            accessibilityRole="button"
            accessibilityState={{disabled: !valid || loading}}
            style={[
              styles.primaryBtn,
              {backgroundColor: valid ? t.brandAction : t.surfaceElevated},
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color={t.brandActionText} />
            ) : (
              <Text
                style={[
                  styles.primaryText,
                  {color: valid ? t.brandActionText : t.textDisabled},
                ]}>
                Send the code
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            style={styles.linkBtn}>
            <Text style={[styles.linkText, {color: t.textTertiary}]}>
              Back to sign in
            </Text>
          </Pressable>
        </>
      }>
      <TextField
        label="Registered email"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="mail"
        error={error}
        hint={error ? undefined : 'The address on your partner account'}
        returnKeyType="send"
        onSubmitEditing={handleSendCode}
      />

      <View style={[styles.note, {backgroundColor: t.surfaceElevated}]}>
        <Icon name="info" size={16} color={t.textTertiary} strokeWidth={2} />
        <Text style={[styles.noteText, {color: t.textSecondary}]}>
          Not sure which email is on file? Your agency can tell you — the app
          cannot change it for you.
        </Text>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
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
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
