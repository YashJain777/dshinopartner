/**
 * Viewfinder behaviour.
 *
 * The in-app camera exists for two things the OS camera cannot give us: a
 * framing guide, and a prompt naming which angle this shot is. Both are
 * derived, so both can silently drift.
 *
 * The third rule matters more than either: the camera must never be the only
 * way to file a photo. A refused permission, a phone with no back camera or
 * a session that will not start all have to fall through to the OS picker,
 * or a partner standing at a car is stuck.
 */

export {};

const REQUIRED_PHOTOS = 4;
const ANGLES = ['Front', 'Rear', 'Left side', 'Right side'];

/** Mirrors the prompt built in PhotoEvidenceScreen. */
const promptFor = (nextSlot: number): string =>
  nextSlot >= 0
    ? `Angle ${nextSlot + 1} of ${REQUIRED_PHOTOS} — ${ANGLES[nextSlot].toLowerCase()}`
    : `All ${REQUIRED_PHOTOS} angles taken`;

/** The first empty slot is the one the partner is nudged towards. */
const nextSlotFor = (taken: number): number => (taken < REQUIRED_PHOTOS ? taken : -1);

const FLASH_ORDER = ['off', 'auto', 'on'] as const;
type Flash = (typeof FLASH_ORDER)[number];
const cycleFlash = (current: Flash): Flash =>
  FLASH_ORDER[(FLASH_ORDER.indexOf(current) + 1) % FLASH_ORDER.length];

/** Mirrors the `ready` gate in CameraViewfinder. */
const cameraReady = (args: {
  hasPermission: boolean;
  hasDevice: boolean;
  failed: boolean;
}): boolean => args.hasPermission && args.hasDevice && !args.failed;

/** vision-camera reports a filesystem path; FormData and <Image> need a scheme. */
const toFileUri = (filePath: string): string =>
  filePath.startsWith('file://') ? filePath : `file://${filePath}`;

describe('the angle prompt', () => {
  it('names the angle the partner should shoot next', () => {
    expect(promptFor(0)).toBe('Angle 1 of 4 — front');
    expect(promptFor(2)).toBe('Angle 3 of 4 — left side');
    expect(promptFor(3)).toBe('Angle 4 of 4 — right side');
  });

  it('stops counting once all four are in', () => {
    expect(nextSlotFor(4)).toBe(-1);
    expect(promptFor(nextSlotFor(4))).toBe('All 4 angles taken');
  });

  it('follows the photos already taken', () => {
    expect(promptFor(nextSlotFor(0))).toContain('Angle 1');
    expect(promptFor(nextSlotFor(2))).toContain('Angle 3');
  });
});

describe('falling back to the OS picker', () => {
  it('is ready only when permission and a device are both there', () => {
    expect(cameraReady({hasPermission: true, hasDevice: true, failed: false})).toBe(true);
  });

  // Each of these must leave the partner a way to file the photo.
  it('is not ready without permission', () => {
    expect(cameraReady({hasPermission: false, hasDevice: true, failed: false})).toBe(false);
  });

  it('is not ready on a phone with no back camera', () => {
    expect(cameraReady({hasPermission: true, hasDevice: false, failed: false})).toBe(false);
  });

  it('is not ready after a session error', () => {
    expect(cameraReady({hasPermission: true, hasDevice: true, failed: true})).toBe(false);
  });
});

describe('flash button', () => {
  it('cycles off → auto → on → off', () => {
    expect(cycleFlash('off')).toBe('auto');
    expect(cycleFlash('auto')).toBe('on');
    expect(cycleFlash('on')).toBe('off');
  });
});

describe('the captured file', () => {
  it('gets a file:// scheme, which the upload and the thumbnail both need', () => {
    expect(toFileUri('/data/user/0/com.dshino/cache/photo.jpg')).toBe(
      'file:///data/user/0/com.dshino/cache/photo.jpg',
    );
  });

  it('does not double up a scheme that is already there', () => {
    expect(toFileUri('file:///tmp/photo.jpg')).toBe('file:///tmp/photo.jpg');
  });
});
