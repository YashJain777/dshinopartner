/**
 * Profile — identity, verification and everything that is not a job.
 *
 * KYC leads the page whenever it is incomplete, because it is the only thing
 * here with a consequence: payouts stay on hold until it clears. Once it is
 * approved it collapses to a single confirming row.
 *
 * Every modal and handler is carried over from the previous version; only the
 * presentation is new.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../components/atoms/Icon';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {FallbackImage} from '../../../../components/common/FallbackImage';
import {ProfileScreenProps} from './ProfileScreen.types';
import {useProfile} from '../../../../hooks/useProfile';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {showImagePickerOptions} from '../../../../utils/camera.utils';
import {EditProfileModal} from './components/EditProfileModal';
import {ChangePasswordModal} from './components/ChangePasswordModal';
import {DeactivateAccountModal} from './components/DeactivateAccountModal';
import {BankDetailsModal} from './components/BankDetailsModal';
import {NotificationSettingsModal} from './components/NotificationSettingsModal';
import {TermsModal} from './components/TermsModal';
import {KycDocumentsModal} from './components/KycDocumentsModal';
import {LogoutConfirmationModal} from './components/LogoutConfirmationModal';
import {getSettings, updateSettings} from '../../../../services/api/settings.api';
import {getKycStatus, submitKycDetails} from '../../../../services/api/kyc.api';
import {NotificationPreferences, KYCStatusResponse} from '../../../../types/api.types';
import {useAuthStore} from '../../../../store/auth.store';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney, initialsOf} from '../../../../utils/format';
import {checkPayoutEligibility} from '../../../../utils/payoutGuard';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

interface MenuRowProps {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  label: string;
  detail?: string;
  badge?: {text: string; bg: string; fg: string};
  danger?: boolean;
  onPress: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {
    profile,
    wallet,
    loading,
    refreshing,
    error,
    refresh,
    withdrawFunds,
    updateAvatar,
    updateProfileInfo,
    changePassword,
    deactivateAccount,
  } = useProfile();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const logout = useAuthStore(state => state.logout);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [deactivateAccountModalVisible, setDeactivateAccountModalVisible] = useState(false);
  const [bankDetailsModalVisible, setBankDetailsModalVisible] = useState(false);
  const [kycDocumentsModalVisible, setKycDocumentsModalVisible] = useState(false);
  const [notificationSettingsModalVisible, setNotificationSettingsModalVisible] =
    useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    bookingAlerts: true,
    paymentAlerts: true,
    promotions: true,
    systemUpdates: true,
  });
  const [kycStatusData, setKycStatusData] = useState<KYCStatusResponse | null>(null);

  const refreshKycStatus = useCallback(async () => {
    try {
      setKycStatusData(await getKycStatus());
    } catch (err) {
      console.warn('Failed to refresh KYC status:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSettings();
        if (settings?.notificationPreferences) {
          setNotificationPrefs(settings.notificationPreferences);
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
      await refreshKycStatus();
    };
    load();
  }, [refreshKycStatus]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * The previous version defaulted the balance to a hardcoded 24850 when the
   * wallet had not loaded, which offered a payout of money that may not exist.
   * A missing balance is now treated as nothing to withdraw.
   *
   * The server also rejects a payout with no approved KYC or no bank details.
   * `checkPayoutEligibility` already encoded exactly those rules but nothing
   * called it, so the partner met a bare 400 instead. When the bank details
   * are what's missing, this opens the form rather than just naming it.
   */
  const handleWithdraw = useCallback(() => {
    const balance = wallet?.balance ?? 0;
    const eligibility = checkPayoutEligibility(kycStatusData, balance);

    if (!eligibility.eligible) {
      Alert.alert(
        eligibility.title || 'Payout unavailable',
        eligibility.message || 'This payout cannot be requested yet.',
        eligibility.missingType === 'BANK'
          ? [
              {text: 'Not now', style: 'cancel'},
              {
                text: 'Add bank details',
                onPress: () => setBankDetailsModalVisible(true),
              },
            ]
          : [{text: 'OK'}],
      );
      return;
    }
    Alert.alert('Request a payout?', `${formatMoney(balance)} will be sent to your bank.`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Request',
        onPress: async () => {
          try {
            await withdrawFunds(balance);
            Alert.alert('Payout requested', 'It usually lands within 24 hours.');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to submit the request');
          }
        },
      },
    ]);
  }, [kycStatusData, wallet, withdrawFunds]);

  const handleEditAvatar = useCallback(async () => {
    try {
      const selectedUri = await showImagePickerOptions('avatar');
      if (selectedUri) {
        setUploading(true);
        await updateAvatar(selectedUri);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to upload the photo');
    } finally {
      setUploading(false);
    }
  }, [updateAvatar]);

  const handleSaveProfile = useCallback(
    async (name: string, email: string, phone: string) => {
      try {
        setSaving(true);
        await updateProfileInfo(name, email, phone);
        setEditModalVisible(false);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to update your details');
      } finally {
        setSaving(false);
      }
    },
    [updateProfileInfo],
  );

  const handleConfirmLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Logout failed');
    }
  }, [logout]);

  const handleDeactivateAccount = useCallback(
    async (data: any) => {
      await deactivateAccount(data);
      await logout();
    },
    [deactivateAccount, logout],
  );

  const handleSaveBankDetails = useCallback(
    async (holderName: string, accountNumber: string, ifsc: string) => {
      try {
        setSavingBankDetails(true);
        await submitKycDetails({
          accountHolderName: holderName,
          bankAccountNumber: accountNumber,
          ifscCode: ifsc,
        });
        setBankDetailsModalVisible(false);
        await refresh();
        await refreshKycStatus();
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to save bank details');
      } finally {
        setSavingBankDetails(false);
      }
    },
    [refresh, refreshKycStatus],
  );

  const handleSaveNotificationSettings = useCallback(
    async (preferences: NotificationPreferences) => {
      try {
        setSavingNotificationSettings(true);
        await updateSettings({notificationPreferences: preferences});
        setNotificationPrefs(preferences);
        setNotificationSettingsModalVisible(false);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to update notification settings');
      } finally {
        setSavingNotificationSettings(false);
      }
    },
    [],
  );

  // ─── KYC summary ───────────────────────────────────────────────────────────

  const kyc = useMemo(() => {
    const checklist = kycStatusData?.checklist ?? [];
    const total = checklist.length || kycStatusData?.requiredDocuments?.length || 0;
    const approved = checklist.filter(d => d.status === 'APPROVED').length;
    const rejected = checklist.filter(d => d.status === 'REJECTED');
    const inReview = checklist.filter(d => d.status === 'PENDING');
    return {
      total,
      approved,
      rejected,
      inReview,
      complete: kycStatusData?.overallKycStatus === 'APPROVED',
    };
  }, [kycStatusData]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const MenuRow: React.FC<MenuRowProps> = ({
    icon,
    iconBg,
    iconColor,
    label,
    detail,
    badge,
    danger,
    onPress,
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={styles.menuRow}>
      <View style={[styles.menuIcon, {backgroundColor: iconBg}]}>
        <Icon name={icon} size={17} color={iconColor} strokeWidth={1.9} />
      </View>
      <View style={styles.menuText}>
        <Text
          style={[styles.menuLabel, {color: danger ? t.dangerInk : t.textPrimary}]}
          numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text style={[numeric, styles.menuDetail, {color: t.textTertiary}]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, {backgroundColor: badge.bg}]}>
          <Text style={[styles.badgeText, {color: badge.fg}]}>{badge.text}</Text>
        </View>
      ) : null}
      <Icon name="chevronRight" size={17} color={t.textDisabled} strokeWidth={2.2} />
    </Pressable>
  );

  if (loading && !profile) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (error && !profile) {
    return <ErrorScreen message={error} onRetry={refresh} />;
  }

  const name = profile?.User?.name || profile?.name || 'Partner';
  const agency = profile?.Agency?.businessName;
  const avatar = profile?.User?.profileImage || profile?.profileImage;
  const bank = kycStatusData?.textDetails;

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      {/* Identity */}
      <View style={[styles.identity, {backgroundColor: t.surfaceInverse}]}>
        <Pressable
          onPress={handleEditAvatar}
          accessibilityRole="button"
          accessibilityLabel="Change your profile photo"
          style={[styles.avatar, {backgroundColor: t.surfaceElevated}]}>
          {uploading ? (
            <ActivityIndicator size="small" color={t.textPrimary} />
          ) : avatar ? (
            <FallbackImage source={{uri: avatar}} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, {color: t.textPrimary}]}>
              {initialsOf(name)}
            </Text>
          )}
          <View style={[styles.avatarBadge, {backgroundColor: t.brandAction}]}>
            <Icon name="camera" size={11} color={t.brandActionText} strokeWidth={2.2} />
          </View>
        </Pressable>

        <View style={styles.identityText}>
          <Text style={[styles.name, {color: t.textOnInverse}]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[numeric, styles.identityMeta, {color: t.textTertiary}]} numberOfLines={1}>
            {[agency, profile?.id ? `ID ${profile.id.slice(0, 8)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {wallet ? (
            <Text style={[numeric, styles.identityWallet, {color: t.brandInk}]}>
              {formatMoney(wallet.balance)} in wallet
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => setEditModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          style={[styles.editBtn, {backgroundColor: t.surfaceElevated}]}>
          <Icon name="edit" size={17} color={t.textPrimary} strokeWidth={1.9} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: screenInsets.tabContentPadding},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }>
        {/* KYC leads whenever it is unfinished. */}
        {kycStatusData && !kyc.complete ? (
          <Pressable
            onPress={() => setKycDocumentsModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Verification, ${kyc.approved} of ${kyc.total} approved`}
            style={[
              styles.card,
              {backgroundColor: t.surface, borderColor: t.warningBorder},
            ]}>
            <View style={styles.kycHead}>
              <Icon name="alert" size={18} color={t.warningInk} strokeWidth={2} />
              <Text style={[styles.kycTitle, {color: t.warningInk}]}>
                Verification — {kyc.approved} of {kyc.total} approved
              </Text>
              <Text style={[styles.kycAction, {color: t.warningInk}]}>Finish</Text>
            </View>

            {kyc.total > 0 ? (
              <View style={styles.kycBar}>
                {Array.from({length: kyc.total}).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.kycSegment,
                      {
                        backgroundColor:
                          i < kyc.approved
                            ? t.success
                            : i < kyc.approved + kyc.inReview.length
                            ? t.warning
                            : kyc.rejected.length
                            ? t.danger
                            : t.outline,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}

            <Text style={[styles.kycBody, {color: t.textSecondary}]}>
              You can keep working. Payouts stay on hold until every document clears.
            </Text>

            {kyc.rejected.map(doc => (
              <View key={doc.documentType} style={styles.kycIssue}>
                <View style={[styles.dot, {backgroundColor: t.danger}]} />
                <Text style={[styles.kycIssueText, {color: t.textSecondary}]} numberOfLines={1}>
                  {kycStatusData.documentLabels?.[doc.documentType] ?? doc.documentType}
                </Text>
                <Text style={[styles.kycIssueState, {color: t.dangerInk}]}>Re-upload</Text>
              </View>
            ))}
            {kyc.inReview.map(doc => (
              <View key={doc.documentType} style={styles.kycIssue}>
                <View style={[styles.dot, {backgroundColor: t.warning}]} />
                <Text style={[styles.kycIssueText, {color: t.textSecondary}]} numberOfLines={1}>
                  {kycStatusData.documentLabels?.[doc.documentType] ?? doc.documentType}
                </Text>
                <Text style={[styles.kycIssueState, {color: t.warningInk}]}>In review</Text>
              </View>
            ))}
          </Pressable>
        ) : null}

        {/* Work */}
        <View style={[styles.group, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <MenuRow
            icon="calendar"
            iconBg={t.infoContainer}
            iconColor={t.infoInk}
            label="Schedule & leaves"
            onPress={() => navigation.navigate('Schedule' as any)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="box"
            iconBg={t.brandContainer}
            iconColor={t.brandInk}
            label="Kit & consumables"
            onPress={() => navigation.navigate('Inventory' as any)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="clock"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Job history"
            onPress={() => navigation.navigate('JobHistory' as any)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="wallet"
            iconBg={t.successContainer}
            iconColor={t.successInk}
            label="Request a payout"
            detail={wallet ? `${formatMoney(wallet.balance)} available` : undefined}
            onPress={handleWithdraw}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="bank"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Bank details"
            detail={bank?.ifscCode ? `IFSC ${bank.ifscCode}` : 'Not added yet'}
            onPress={() => setBankDetailsModalVisible(true)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="idCard"
            iconBg={t.brandContainer}
            iconColor={t.brandInk}
            label="Documents"
            badge={
              kyc.complete
                ? {text: 'Approved', bg: t.successContainer, fg: t.successInk}
                : kyc.rejected.length
                ? {text: 'Action needed', bg: t.dangerContainer, fg: t.dangerInk}
                : undefined
            }
            onPress={() => setKycDocumentsModalVisible(true)}
          />
        </View>

        {/* Account */}
        <View style={[styles.group, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <MenuRow
            icon="bell"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Notifications"
            onPress={() => setNotificationSettingsModalVisible(true)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="lock"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Change password"
            onPress={() => setChangePasswordModalVisible(true)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="chat"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Support tickets"
            onPress={() => navigation.navigate('SupportTickets' as any)}
          />
          <View style={[styles.divider, {backgroundColor: t.outline}]} />
          <MenuRow
            icon="document"
            iconBg={t.neutralContainer}
            iconColor={t.neutralInk}
            label="Terms & privacy"
            onPress={() => setTermsModalVisible(true)}
          />
        </View>

        {/* Leaving */}
        <View style={[styles.group, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <MenuRow
            icon="userOff"
            iconBg={t.dangerContainer}
            iconColor={t.dangerInk}
            label="Deactivate account"
            danger
            onPress={() => setDeactivateAccountModalVisible(true)}
          />
        </View>

        <Pressable
          onPress={() => setLogoutModalVisible(true)}
          accessibilityRole="button"
          style={[styles.logout, {borderColor: t.dangerBorder, backgroundColor: t.surface}]}>
          <Text style={[styles.logoutText, {color: t.dangerInk}]}>Log out</Text>
        </Pressable>
      </ScrollView>

      {/* Modals — unchanged */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialName={name}
        initialEmail={profile?.User?.email || profile?.email || ''}
        initialPhone={profile?.User?.phone || profile?.phone || ''}
        onSave={handleSaveProfile}
        saving={saving}
      />
      <ChangePasswordModal
        visible={changePasswordModalVisible}
        onClose={() => setChangePasswordModalVisible(false)}
        onSubmit={changePassword}
      />
      <DeactivateAccountModal
        visible={deactivateAccountModalVisible}
        onClose={() => setDeactivateAccountModalVisible(false)}
        onSubmit={handleDeactivateAccount}
      />
      <BankDetailsModal
        visible={bankDetailsModalVisible}
        onClose={() => setBankDetailsModalVisible(false)}
        initialHolderName={bank?.accountHolderName || ''}
        initialAccountNumber={bank?.bankAccountNumber || ''}
        initialIfscCode={bank?.ifscCode || ''}
        onSave={handleSaveBankDetails}
        saving={savingBankDetails}
      />
      <NotificationSettingsModal
        visible={notificationSettingsModalVisible}
        onClose={() => setNotificationSettingsModalVisible(false)}
        initialPreferences={notificationPrefs}
        onSave={handleSaveNotificationSettings}
        saving={savingNotificationSettings}
      />
      <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
      <KycDocumentsModal
        visible={kycDocumentsModalVisible}
        onClose={() => {
          setKycDocumentsModalVisible(false);
          refreshKycStatus();
        }}
        onKycStatusChange={() => refreshKycStatus()}
      />
      <LogoutConfirmationModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        onConfirm={handleConfirmLogout}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.19,
  },
  identityMeta: {
    fontSize: 12,
  },
  identityWallet: {
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: 13,
    gap: 10,
  },
  kycHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  kycTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  kycAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  kycBar: {
    flexDirection: 'row',
    gap: 5,
  },
  kycSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  kycBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  kycIssue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  kycIssueText: {
    flex: 1,
    fontSize: 12,
  },
  kycIssueState: {
    fontSize: 11,
    fontWeight: '700',
  },
  group: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 13,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuDetail: {
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logout: {
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
