/**
 * Reset password — the code, then a new password.
 *
 * The complexity rule is the backend's Joi regex, shown as a live checklist
 * instead of a wall of text after a rejected submit. The partner can see
 * which requirement is still missing while they type.
 */

import React, {useMemo, useState} from 'react';
import {View, Pressable, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {TextField} from '../../../../components/atoms/TextField';
import {AuthLayout, authTokens as t} from '../../../../components/molecules/AuthLayout';
import {authService} from '../../../../services/auth.service';
import {ResetPasswordScreenProps} from './ResetPasswordScreen.types';
import {radii} from '../../../../theme/tokens';

const CODE_LENGTH = 6;

/** Each rule the backend's password regex enforces, checkable on its own. */
const RULES: {key: string; label: string; test: (v: string) => boolean}[] = [
  {key: 'len', label: 'At least 8 characters', test: v => v.length >= 8},
  {key: 'lower', label: 'A lowercase letter', test: v => /[a-z]/.test(v)},
  {key: 'upper', label: 'An uppercase letter', test: v => /[A-Z]/.test(v)},
  {key: 'digit', label: 'A number', test: v => /\d/.test(v)},
  {
    key: 'special',
    label: 'A special character',
    test: v => /[@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\\|`~]/.test(v),
  },
];

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
  route,
}) => {
  const {email} = route.params;

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanCode = code.trim();
  const cleanPassword = password.trim();
  const cleanConfirm = confirm.trim();

  const ruleState = useMemo(
    () => RULES.map(r => ({...r, passed: r.test(cleanPassword)})),
    [cleanPassword],
  );
  const passwordOk = ruleState.every(r => r.passed);
  const codeOk = cleanCode.length === CODE_LENGTH;
  const matchOk = cleanPassword.length > 0 && cleanPassword === cleanConfirm;
  const canSubmit = codeOk && passwordOk && matchOk;

  const handleReset = async () => {
    if (!canSubmit) {
      return;
    }
    try {
      setLoading(true);
      const response = await authService.resetPassword(email, cleanCode, cleanPassword);
      if (response.success) {
        Alert.alert('Password changed', 'Sign in with your new password.', [
          {text: 'Sign in', onPress: () => navigation.navigate('Login')},
        ]);
      } else {
        Alert.alert('Could not reset', response.error?.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={`Enter the ${CODE_LENGTH}-digit code we sent to ${email}.`}
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          onPress={handleReset}
          disabled={!canSubmit || loading}
          accessibilityRole="button"
          accessibilityState={{disabled: !canSubmit || loading}}
          style={[
            styles.primaryBtn,
            {backgroundColor: canSubmit ? t.brandAction : t.surfaceElevated},
          ]}>
          {loading ? (
            <ActivityIndicator size="small" color={t.brandActionText} />
          ) : (
            <Text
              style={[
                styles.primaryText,
                {color: canSubmit ? t.brandActionText : t.textDisabled},
              ]}>
              Change password
            </Text>
          )}
        </Pressable>
      }>
      <TextField
        label="Reset code"
        value={code}
        onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        placeholder="------"
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        tabular
        leftIcon="mail"
        hint={
          codeOk
            ? undefined
            : `${cleanCode.length} of ${CODE_LENGTH} digits`
        }
      />

      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your new password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="lock"
        rightIcon={showPassword ? 'close' : 'shield'}
        rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
        onRightIconPress={() => setShowPassword(v => !v)}
      />

      {/* Live rule checklist, so nothing is a surprise on submit. */}
      <View style={[styles.rules, {backgroundColor: t.surfaceElevated}]}>
        {ruleState.map(rule => (
          <View key={rule.key} style={styles.ruleRow}>
            <Icon
              name={rule.passed ? 'check' : 'close'}
              size={14}
              color={rule.passed ? t.success : t.textDisabled}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.ruleText,
                {color: rule.passed ? t.textSecondary : t.textTertiary},
              ]}>
              {rule.label}
            </Text>
          </View>
        ))}
      </View>

      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        secureTextEntry={!showConfirm}
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="lock"
        rightIcon={showConfirm ? 'close' : 'shield'}
        rightIconLabel={showConfirm ? 'Hide password' : 'Show password'}
        onRightIconPress={() => setShowConfirm(v => !v)}
        error={
          cleanConfirm.length > 0 && !matchOk ? 'The two passwords do not match' : undefined
        }
        returnKeyType="done"
        onSubmitEditing={handleReset}
      />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  rules: {
    borderRadius: radii.md,
    padding: 12,
    gap: 7,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ruleText: {
    fontSize: 12,
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
});
