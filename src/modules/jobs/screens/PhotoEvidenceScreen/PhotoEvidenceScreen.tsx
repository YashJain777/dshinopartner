/**
 * Photo evidence — the four angles the backend demands before a status moves.
 *
 * The old flow was a bare image picker with a counter: the partner could not
 * tell which angle was still missing, so they re-shot the same panel. Here
 * each slot is named, and the one being shot next is highlighted.
 *
 * Slots are positional labels for the partner, not a server contract — the
 * backend only counts photos per side. So a slot shows the Nth uploaded photo
 * of that side, and the first empty slot is the suggested next shot.
 *
 * Dark in both themes, like every camera surface: the partner is comparing
 * what is on screen with a car in front of them, and a white screen in a
 * dim basement car park is the wrong tool.
 *
 * A capture no longer blocks on the network. The photo goes into the upload
 * queue and the partner carries on shooting; the queue retries in the
 * background and the strip shows what is still going up. Before this, a
 * dropped connection simply lost the photo.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {useIsFocused} from '@react-navigation/native';
import {CameraViewfinder} from '../../../../components/molecules/CameraViewfinder';
import {usePhotoQueue} from '../../../../hooks/usePhotoQueue';
import {enqueuePhoto} from '../../../../services/upload/photoQueue';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useActiveJob} from '../../../../hooks/useActiveJob';
import {openCamera, openGallery} from '../../../../utils/camera.utils';
import {Booking} from '../../../../types/api.types';
import {tokens, radii} from '../../../../theme/tokens';

/** A camera surface is dark in both themes. */
const t = tokens.dark;

const REQUIRED_PHOTOS = 4;

/** What a partner should actually point the camera at, in order. */
const ANGLES = [
  {key: 'front', label: 'Front', hint: 'Bumper and number plate in frame'},
  {key: 'rear', label: 'Rear', hint: 'Boot and rear plate'},
  {key: 'left', label: 'Left side', hint: 'Full panel, front to back'},
  {key: 'right', label: 'Right side', hint: 'Full panel, front to back'},
];

const evidenceUrls = (booking: Booking | null, type: 'before' | 'after'): string[] => {
  if (!booking) {
    return [];
  }
  const fromEvidence = (booking.evidence ?? [])
    .filter(e => e?.url && e.type?.toLowerCase() === type)
    .map(e => e.url);
  if (fromEvidence.length) {
    return fromEvidence;
  }
  return (type === 'before' ? booking.beforePhotos : booking.afterPhotos) ?? [];
};

interface PhotoEvidenceScreenProps {
  navigation: any;
  route: {params?: {type?: 'BEFORE' | 'AFTER'; bookingId?: string}};
}

export const PhotoEvidenceScreen: React.FC<PhotoEvidenceScreenProps> = ({
  navigation,
  route,
}) => {
  const screenInsets = useScreenInsets();
  // The session must stop when the partner navigates away, or the camera
  // keeps the sensor and the torch alive behind another screen.
  const isFocused = useIsFocused();
  // Pinned to the job that sent us here. Without the id this uploaded to
  // whichever job the server called "active", so with two jobs in hand the
  // photos could be filed against the wrong booking.
  const {booking, loading, refresh} = useActiveJob(route.params?.bookingId);

  const [picking, setPicking] = useState(false);
  const [cameraUsable, setCameraUsable] = useState(true);
  const [cameraReason, setCameraReason] = useState<string | null>(null);

  // Default to the side the job currently needs.
  const type: 'BEFORE' | 'AFTER' =
    route.params?.type ?? (booking?.status === 'IN_PROGRESS' ? 'AFTER' : 'BEFORE');
  const side = type.toLowerCase() as 'before' | 'after';

  const jobId = booking?.bookingId || booking?.id || route.params?.bookingId;
  const {waiting, lost, retry, discard, drainNow} = usePhotoQueue(jobId, type);

  const urls = useMemo(() => evidenceUrls(booking, side), [booking, side]);
  const confirmed = urls.length;

  // A queued photo counts towards the four for the partner's purposes — they
  // have taken it. The gate that actually matters is the server's, so the
  // counter still separates "on the server" from "still going up".
  const taken = confirmed + waiting.length;
  const remaining = Math.max(REQUIRED_PHOTOS - taken, 0);
  const complete = confirmed >= REQUIRED_PHOTOS;

  // When the queue empties, the server has photos this screen has not read yet.
  const waitingCount = waiting.length;
  useEffect(() => {
    if (waitingCount === 0) {
      refresh();
    }
  }, [waitingCount, refresh]);

  /**
   * Hand it to the queue and return immediately: the partner can shoot the
   * next angle while this one uploads, and a dead spot no longer costs them
   * the photo.
   */
  const accept = useCallback(
    async (uri: string) => {
      if (!jobId) {
        return;
      }
      try {
        await enqueuePhoto(jobId, uri, type);
      } catch (err: any) {
        Alert.alert('Could not add that photo', err?.message || 'Please try again.');
      }
    },
    [jobId, type],
  );

  /**
   * Runs one of the OS pickers and queues whatever comes back.
   *
   * Everything here used to call `showImagePickerOptions`, which puts up a
   * "Take Photo / Choose from Gallery" dialog. On this screen that question
   * is already answered: the shutter takes photos and the gallery button
   * picks from the gallery. Asking again on every single shot — four per
   * side, eight per job — was pure friction.
   */
  const pickWith = useCallback(
    async (open: () => Promise<string | null>) => {
      if (picking || !jobId) {
        return;
      }
      try {
        setPicking(true);
        const uri = await open();
        if (uri) {
          await accept(uri);
        }
      } catch (err: any) {
        Alert.alert('Could not add that photo', err?.message || 'Please try again.');
      } finally {
        setPicking(false);
      }
    },
    [accept, jobId, picking],
  );

  /** The gallery button says gallery, so it opens the gallery. */
  const pickFromGallery = useCallback(() => pickWith(() => openGallery('evidence')), [pickWith]);

  /** The fallback card when the viewfinder cannot run — straight to the camera. */
  const shootWithOsCamera = useCallback(() => pickWith(() => openCamera('evidence')), [pickWith]);

  /**
   * The viewfinder is the intended path, but it must never be the only one:
   * a refused permission or a camera that will not start would otherwise
   * leave a partner standing at a car unable to file anything.
   */
  const handleCameraUnavailable = useCallback((reason: string) => {
    setCameraReason(reason);
    setCameraUsable(false);
  }, []);

  if (loading && !booking) {
    return <LoadingScreen message="Loading the job..." />;
  }

  if (!booking) {
    return (
      <ScreenContainer backgroundColor={t.surfaceContainer}>
        <ScreenHeader title="Photo evidence" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Icon name="camera" size={26} color={t.textDisabled} />
          <Text style={[styles.emptyTitle, {color: t.textHeading}]}>No live job</Text>
          <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
            Open a stop from your route first.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  /** The first empty slot is the one we nudge them towards. */
  const nextSlot = taken < REQUIRED_PHOTOS ? taken : -1;

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title={type === 'BEFORE' ? 'Before photos' : 'After photos'}
        subtitle={`${taken} of ${REQUIRED_PHOTOS} taken`}
        subtitleNumeric
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: 92 + screenInsets.stickyBarPadding},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* The viewfinder — the framing guide and the named angle are the
            whole reason this is not the OS camera. */}
        {cameraUsable ? (
          <CameraViewfinder
            prompt={
              nextSlot >= 0
                ? `Angle ${nextSlot + 1} of ${REQUIRED_PHOTOS} — ${ANGLES[nextSlot].label.toLowerCase()}`
                : `All ${REQUIRED_PHOTOS} angles taken`
            }
            hint={
              nextSlot >= 0 ? ANGLES[nextSlot].hint : 'Shoot another if something is unclear'
            }
            onCapture={accept}
            onPickFromGallery={pickFromGallery}
            onUnavailable={handleCameraUnavailable}
            isActive={isFocused}
            disabled={picking}
          />
        ) : (
          <Pressable
            onPress={shootWithOsCamera}
            accessibilityRole="button"
            style={[styles.cameraFallback, {backgroundColor: t.surfaceElevated}]}>
            <Icon name="camera" size={24} color={t.textTertiary} strokeWidth={1.8} />
            <Text style={[styles.cameraFallbackTitle, {color: t.textHeading}]}>
              Using your phone's camera
            </Text>
            <Text style={[styles.cameraFallbackBody, {color: t.textTertiary}]}>
              {cameraReason || 'The in-app camera is unavailable.'} Tap to take a photo
              the usual way — keep the whole panel in frame.
            </Text>
          </Pressable>
        )}

        {/* One line of why, once. The viewfinder names the angle and the
            header carries the count, so this does not repeat either. */}
        <Text style={[styles.lede, {color: complete ? t.successInk : t.textSecondary}]}>
          {complete
            ? type === 'BEFORE'
              ? 'All four are on the server — you can start the service.'
              : 'All four are on the server — you can finish the job.'
            : type === 'BEFORE'
            ? `Shoot all four panels before you touch the car. ${remaining} to go.`
            : `Shoot the finished car from all four angles. ${remaining} to go.`}
        </Text>

        {/* Slots */}
        <View style={styles.grid}>
          {ANGLES.map((angle, i) => {
            const uri = urls[i];
            // Queued photos fill the slots after the confirmed ones, in order.
            const queued = !uri ? waiting[i - confirmed] : undefined;
            const isNext = i === nextSlot;

            return (
              // Not a button. The shutter above takes the photo and the
              // gallery button picks one; a slot is where the result lands.
              // Tapping one used to raise the "Take Photo / Choose from
              // Gallery" dialog, so the partner answered the same question
              // on every shot. Keeping the status readable to a screen
              // reader is all a slot has to do.
              <View
                key={angle.key}
                accessible
                accessibilityLabel={
                  uri
                    ? `${angle.label}, uploaded`
                    : queued
                    ? `${angle.label}, waiting to upload`
                    : isNext
                    ? `${angle.label}, next to shoot`
                    : `${angle.label}, not taken yet`
                }
                style={[
                  styles.slot,
                  {
                    backgroundColor: t.surface,
                    borderColor: isNext && !uri ? t.brandAction : t.outline,
                    borderWidth: isNext && !uri ? 2 : 1,
                  },
                ]}>
                <View style={[styles.thumb, {backgroundColor: t.surfaceContainer}]}>
                  {uri ? (
                    <Image source={{uri}} style={styles.thumbImage} resizeMode="cover" />
                  ) : queued ? (
                    <Image
                      source={{uri: queued.uri}}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Icon
                      name="camera"
                      size={22}
                      color={isNext ? t.brandAction : t.textDisabled}
                      strokeWidth={1.9}
                    />
                  )}
                  {uri ? (
                    <View style={[styles.tick, {backgroundColor: t.success}]}>
                      <Icon
                        name="check"
                        size={11}
                        color={t.successOnSolid}
                        strokeWidth={3.4}
                      />
                    </View>
                  ) : queued ? (
                    <View style={[styles.tick, {backgroundColor: t.warning}]}>
                      {queued.state === 'uploading' ? (
                        <ActivityIndicator size="small" color={t.warningOnSolid} />
                      ) : (
                        <Icon
                          name="clock"
                          size={11}
                          color={t.warningOnSolid}
                          strokeWidth={3}
                        />
                      )}
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.slotLabel, {color: t.textHeading}]}>
                  {angle.label}
                </Text>
                <Text
                  style={[
                    styles.slotHint,
                    {color: queued ? t.warningInk : t.textTertiary},
                  ]}
                  numberOfLines={2}>
                  {uri
                    ? 'Uploaded'
                    : queued
                    ? queued.state === 'uploading'
                      ? 'Uploading…'
                      : 'Waiting for signal'
                    : angle.hint}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Extra photos beyond the four */}
        {urls.length > REQUIRED_PHOTOS ? (
          <View style={[styles.extra, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.extraTitle, {color: t.textHeading}]}>
              Extra photos
            </Text>
            <View style={styles.extraRow}>
              {urls.slice(REQUIRED_PHOTOS).map(uri => (
                <Image
                  key={uri}
                  source={{uri}}
                  style={[styles.extraThumb, {backgroundColor: t.placeholder}]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Still going up. The partner can keep shooting regardless. */}
        {waiting.length ? (
          <Pressable
            onPress={() => drainNow()}
            accessibilityRole="button"
            accessibilityLabel="Retry the waiting uploads now"
            style={[styles.note, {backgroundColor: t.warningContainer}]}>
            <Icon name="clock" size={16} color={t.warningInk} strokeWidth={2} />
            <Text style={[styles.noteText, {color: t.warningInk}]}>
              {waiting.length === 1
                ? '1 photo waiting for signal — it will upload on its own.'
                : `${waiting.length} photos waiting for signal — they will upload on their own.`}{' '}
              Keep shooting; tap here to try now.
            </Text>
          </Pressable>
        ) : null}

        {/* Gave up. These need a re-shoot, so say so plainly. */}
        {lost.map(item => (
          <View
            key={item.id}
            style={[styles.note, {backgroundColor: t.dangerContainer}]}>
            <Icon name="alert" size={16} color={t.dangerInk} strokeWidth={2} />
            <View style={styles.lostBody}>
              <Text style={[styles.noteText, {color: t.dangerInk}]}>
                One photo could not be uploaded. {item.lastError || ''}
              </Text>
              <View style={styles.lostActions}>
                <Pressable
                  onPress={() => retry(item.id)}
                  accessibilityRole="button"
                  style={[styles.lostBtn, {borderColor: t.dangerBorder}]}>
                  <Text style={[styles.lostBtnText, {color: t.dangerInk}]}>
                    Try again
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => discard(item.id)}
                  accessibilityRole="button"
                  style={[styles.lostBtn, {borderColor: t.dangerBorder}]}>
                  <Text style={[styles.lostBtnText, {color: t.dangerInk}]}>
                    Discard and re-shoot
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <View style={[styles.note, {backgroundColor: t.neutralContainer}]}>
          <Icon name="info" size={16} color={t.neutralInk} strokeWidth={2} />
          <Text style={[styles.noteText, {color: t.textSecondary}]}>
            Photos keep uploading in the background, so you can shoot all four
            without waiting. The job only unlocks once the server has them.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: t.surface,
            borderTopColor: t.outline,
            paddingBottom: screenInsets.stickyBarPadding,
          },
        ]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          style={[
            styles.primaryBtn,
            {backgroundColor: complete ? t.brandAction : t.neutralContainer},
          ]}>
          <Text
            style={[
              styles.primaryBtnText,
              {color: complete ? t.brandActionText : t.textSecondary},
            ]}>
            {complete
              ? 'Back to the job'
              : `${remaining} more photo${remaining === 1 ? '' : 's'} needed`}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slot: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: radii.md,
    padding: 10,
    gap: 7,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  tick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  slotHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  extra: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  extraTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  extraRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  extraThumb: {
    width: 62,
    height: 62,
    borderRadius: radii.sm,
  },
  lede: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  cameraFallback: {
    alignItems: 'center',
    gap: 6,
    padding: 18,
    borderRadius: radii.lg,
  },
  cameraFallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cameraFallbackBody: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  lostBody: {
    flex: 1,
    gap: 8,
  },
  lostActions: {
    flexDirection: 'row',
    gap: 8,
  },
  lostBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  lostBtnText: {
    fontSize: 11,
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
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 50,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
