/**
 * Signup — phone, code, then the profile.
 *
 * Zones, vehicle types and services are UUIDs the backend validates strictly.
 * The previous version shipped hardcoded slug fallbacks ('south-delhi',
 * 'Hatchback') for when the catalogue failed to load; `filterValidUUIDs` then
 * silently dropped them, so a partner could tick three zones and register
 * with none. Here a failed catalogue says so and offers a retry instead.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {TextField} from '../../../../components/atoms/TextField';
import {OtpBoxes} from '../../../../components/atoms/OtpBoxes';
import {AuthLayout, authTokens as t} from '../../../../components/molecules/AuthLayout';
import {useAuthStore} from '../../../../store/auth.store';
import {filterValidUUIDs} from '../../../../utils/validation';
import {OTP_TYPES} from '../../../../constants/api.constants';
import {apiService} from '../../../../services/api.service';
import {authService} from '../../../../services/auth.service';
import {radii} from '../../../../theme/tokens';
import {initialsOf} from '../../../../utils/format';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;

interface Option {
  id: string;
  label: string;
}

interface SignupScreenProps {
  navigation?: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({navigation}) => {
  const [step, setStep] = useState(1);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<any>(null);

  const [vehicles, setVehicles] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  const [vehicleOptions, setVehicleOptions] = useState<Option[]>([]);
  const [zoneOptions, setZoneOptions] = useState<Option[]>([]);
  const [skillOptions, setSkillOptions] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const {sendOTP, registerPartner, isLoading} = useAuthStore();

  const fullPhone = `${countryCode}${phoneNumber}`;
  const isValidPhone = phoneNumber.length === PHONE_LENGTH;
  const isValidOtp = otp.length === OTP_LENGTH;

  /** Catalogue for step 3. Every id here is a real UUID from the server. */
  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [vehicleRes, zoneRes, serviceRes] = await Promise.all([
        apiService.get<any>('/public/vehicle-hierarchy'),
        apiService.get<any>('/public/locations/zones'),
        apiService.get<any>('/public/services'),
      ]);

      const v: Option[] = [];
      if (vehicleRes?.success && Array.isArray(vehicleRes.data)) {
        vehicleRes.data.forEach((category: any) => {
          (category.subCategories ?? []).forEach((sub: any) =>
            v.push({id: sub.id, label: sub.name}),
          );
        });
      }

      const z: Option[] =
        zoneRes?.success && Array.isArray(zoneRes.data)
          ? zoneRes.data.map((item: any) => ({id: item.id, label: item.name}))
          : [];

      const s: Option[] = [];
      if (serviceRes?.success && Array.isArray(serviceRes.data)) {
        serviceRes.data.forEach((cat: any) => {
          (cat.Services ?? []).forEach((service: any) =>
            s.push({id: service.id, label: service.name}),
          );
        });
      }

      setVehicleOptions(v);
      setZoneOptions(z);
      setSkillOptions(s);

      if (!v.length && !z.length && !s.length) {
        setOptionsError('The catalogue came back empty. Your agency can set this later.');
      }
    } catch {
      setOptionsError('Could not load zones and vehicle types.');
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3) {
      loadOptions();
    }
  }, [step, loadOptions]);

  const toggle = (id: string, list: string[], set: (v: string[]) => void) =>
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const handleSendOTP = async () => {
    if (!isValidPhone) {
      return;
    }
    const result = await sendOTP(fullPhone, OTP_TYPES.SIGNUP);
    if (result.success) {
      setStep(2);
    } else {
      Alert.alert('Could not send the code', result.error || 'Please try again.');
    }
  };

  /**
   * Checks the code before the profile step rather than after it.
   *
   * `POST /verify-otp` is a read-only check — it passes markAsUsed=false — so
   * the code survives for the register call that actually consumes it. Without
   * this, a typo in the code is only discovered after the partner has filled
   * in their name, photo, zones and vehicle types.
   */
  const handleVerifyOtp = async () => {
    if (!isValidOtp) {
      return;
    }
    setVerifyingOtp(true);
    try {
      await authService.verifyOTP(fullPhone, otp, OTP_TYPES.SIGNUP);
      setStep(3);
    } catch (err: any) {
      Alert.alert(
        'That code did not match',
        err?.response?.data?.message || 'Check the SMS and try again.',
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleImagePick = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets?.length) {
      setProfileImage(result.assets[0]);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    const formData = new FormData();
    formData.append('phone', fullPhone);
    formData.append('name', name.trim());
    formData.append('otpCode', otp);
    if (email.trim()) {
      formData.append('email', email.trim());
    }

    // Belt and braces: the options are UUIDs already, but the backend rejects
    // the whole request if even one entry is not one.
    const validVehicles = filterValidUUIDs(vehicles);
    const validZones = filterValidUUIDs(zones);
    const validSkills = filterValidUUIDs(skills);

    if (validVehicles.length) {
      formData.append('vehicleTypesServed', JSON.stringify(validVehicles));
    }
    if (validZones.length) {
      formData.append('zoneIds', JSON.stringify(validZones));
    }
    if (validSkills.length) {
      formData.append('serviceSpecializations', JSON.stringify(validSkills));
    }

    if (profileImage) {
      formData.append('image', {
        uri: profileImage.uri,
        name: profileImage.fileName || 'profile.jpg',
        type: profileImage.type || 'image/jpeg',
      } as any);
    }

    const result = await registerPartner(formData);
    if (!result.success) {
      const message = result.error || 'Please check your details and try again.';
      // The code is only valid for 10 minutes, and filling in this step can
      // take longer than that. Send them back to the code step with a fresh
      // one instead of leaving them on a dead end.
      if (/expired|invalid.*otp|otp.*invalid/i.test(message)) {
        Alert.alert('Your code has expired', 'We can send a new one to your number.', [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Send a new code',
            onPress: async () => {
              setOtp('');
              setStep(2);
              const resend = await sendOTP(fullPhone, OTP_TYPES.SIGNUP);
              if (!resend.success) {
                Alert.alert('Could not send the code', resend.error || 'Please try again.');
              }
            },
          },
        ]);
        return;
      }
      Alert.alert('Registration failed', message);
    }
    // On success the auth store flips and the root navigator swaps itself.
  };

  const chipGroup = (
    label: string,
    options: Option[],
    selected: string[],
    set: (v: string[]) => void,
  ) => (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, {color: t.textTertiary}]}>
        {label.toUpperCase()}
        {selected.length ? ` · ${selected.length}` : ''}
      </Text>
      {options.length ? (
        <View style={styles.chipWrap}>
          {options.map(option => {
            const on = selected.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggle(option.id, selected, set)}
                accessibilityRole="checkbox"
                accessibilityState={{checked: on}}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? t.brandContainer : t.surfaceElevated,
                    borderColor: on ? t.brandAction : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    {color: on ? t.brandInk : t.textSecondary},
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.blockEmpty, {color: t.textDisabled}]}>
          Nothing to choose from yet.
        </Text>
      )}
    </View>
  );

  const stepTitle = useMemo(() => {
    if (step === 1) {
      return {title: 'Create your account', sub: 'Start with the number your agency has.'};
    }
    if (step === 2) {
      return {title: 'Enter the code', sub: `We sent ${OTP_LENGTH} digits to ${fullPhone}.`};
    }
    return {title: 'Tell us about you', sub: 'Your agency can change any of this later.'};
  }, [step, fullPhone]);

  const busy = isLoading || verifyingOtp;

  const primary =
    step === 1
      ? {label: 'Send the code', onPress: handleSendOTP, enabled: isValidPhone}
      : step === 2
      ? {label: 'Continue', onPress: handleVerifyOtp, enabled: isValidOtp}
      : {label: 'Create account', onPress: handleSignup, enabled: name.trim().length > 1};

  return (
    <AuthLayout
      showBrand={step === 1}
      title={stepTitle.title}
      subtitle={stepTitle.sub}
      step={{current: step, total: 3}}
      onBack={step > 1 ? () => setStep(step - 1) : () => navigation?.goBack()}
      footer={
        <>
          <Pressable
            onPress={primary.onPress}
            disabled={!primary.enabled || busy}
            accessibilityRole="button"
            accessibilityState={{disabled: !primary.enabled || busy}}
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  primary.enabled && !busy ? t.brandAction : t.surfaceElevated,
              },
            ]}>
            {busy ? (
              <ActivityIndicator size="small" color={t.brandActionText} />
            ) : (
              <Text
                style={[
                  styles.primaryText,
                  {color: primary.enabled ? t.brandActionText : t.textDisabled},
                ]}>
                {primary.label}
              </Text>
            )}
          </Pressable>
          {step === 1 ? (
            <Pressable
              onPress={() => navigation?.navigate('Login')}
              accessibilityRole="button"
              style={styles.linkBtn}>
              <Text style={[styles.linkText, {color: t.textTertiary}]}>
                Already registered? Sign in
              </Text>
            </Pressable>
          ) : null}
        </>
      }>
      {step === 1 ? (
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
          hint={`${phoneNumber.length} of ${PHONE_LENGTH} digits`}
        />
      ) : null}

      {step === 2 ? (
        <>
          <OtpBoxes
            value={otp}
            onChangeText={setOtp}
            length={OTP_LENGTH}
            autoFocus
            accessibilityLabel="SMS verification code"
            palette={t}
          />
          <Text style={[styles.otpHint, {color: t.textTertiary}]}>
            Reading the SMS automatically…
          </Text>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Pressable
            onPress={handleImagePick}
            accessibilityRole="button"
            accessibilityLabel="Add a profile photo"
            style={styles.avatarRow}>
            <View style={[styles.avatar, {backgroundColor: t.surfaceElevated}]}>
              {profileImage?.uri ? (
                <Image source={{uri: profileImage.uri}} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, {color: t.textTertiary}]}>
                  {initialsOf(name)}
                </Text>
              )}
              <View style={[styles.avatarBadge, {backgroundColor: t.brandAction}]}>
                <Icon
                  name="camera"
                  size={11}
                  color={t.brandActionText}
                  strokeWidth={2.2}
                />
              </View>
            </View>
            <Text style={[styles.avatarHint, {color: t.textTertiary}]}>
              {profileImage ? 'Tap to change your photo' : 'Add a photo (optional)'}
            </Text>
          </Pressable>

          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="As it appears on your ID"
            autoCapitalize="words"
            leftIcon="user"
          />

          <TextField
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail"
          />

          {/* There was an "Agency code" field here. The backend's agencyId must
              be a UUID, so anything a partner could actually be told — "DSH-12",
              a branch name — failed validation and took the whole registration
              down with it. The agency links the partner from their own panel
              after KYC, so the field is gone rather than misleading. */}
          <View style={[styles.noteRow, {backgroundColor: t.surfaceElevated}]}>
            <Icon name="briefcase" size={16} color={t.textTertiary} strokeWidth={1.9} />
            <Text style={[styles.noteText, {color: t.textSecondary}]}>
              Your agency links you to their team after your documents are
              approved. Nothing to enter here.
            </Text>
          </View>

          {optionsLoading ? (
            <View style={[styles.optionsState, {backgroundColor: t.surfaceElevated}]}>
              <ActivityIndicator size="small" color={t.brand} />
              <Text style={[styles.optionsStateText, {color: t.textSecondary}]}>
                Loading zones and vehicle types…
              </Text>
            </View>
          ) : optionsError ? (
            <View
              style={[
                styles.optionsState,
                {backgroundColor: t.warningContainer},
              ]}>
              <Icon name="alert" size={16} color={t.warningInk} strokeWidth={2} />
              <View style={styles.optionsStateBody}>
                <Text style={[styles.optionsStateText, {color: t.warningInk}]}>
                  {optionsError} You can still create the account — your agency
                  will set your zones.
                </Text>
                <Pressable onPress={loadOptions} accessibilityRole="button" hitSlop={8}>
                  <Text style={[styles.retry, {color: t.warningInk}]}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {chipGroup('Zones you can work', zoneOptions, zones, setZones)}
              {chipGroup('Vehicles you service', vehicleOptions, vehicles, setVehicles)}
              {chipGroup('Services you can do', skillOptions, skills, setSkills)}
            </>
          )}
        </>
      ) : null}
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  avatarRow: {
    alignItems: 'center',
    gap: 9,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
  },
  otpHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noteRow: {
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
  block: {
    gap: 9,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
  },
  blockEmpty: {
    fontSize: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionsState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
  },
  optionsStateBody: {
    flex: 1,
    gap: 6,
  },
  optionsStateText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  retry: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
