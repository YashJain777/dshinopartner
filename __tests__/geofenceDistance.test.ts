/**
 * Geofence distance.
 *
 * The live-job gate decides whether to show "Inside the 200 m zone" or "Too
 * far" from this function, so an error here either blocks a partner who is
 * standing at the car or invites a tap the server will reject.
 */

import {distanceInMeters} from '../src/utils/location';

// A point in Udaipur, where the sample route runs.
const PIN = {lat: 24.5938, lng: 73.7125};

describe('distanceInMeters', () => {
  it('is zero at the same point', () => {
    expect(distanceInMeters(PIN, PIN)).toBe(0);
  });

  it('is symmetric', () => {
    const other = {lat: 24.6, lng: 73.72};
    expect(distanceInMeters(PIN, other)).toBe(distanceInMeters(other, PIN));
  });

  it('matches one degree of latitude (~111 km)', () => {
    const north = {lat: PIN.lat + 1, lng: PIN.lng};
    const metres = distanceInMeters(PIN, north);
    // Mean meridian degree is 111.19 km; allow 0.5 km for the spherical model.
    expect(metres).toBeGreaterThan(110_700);
    expect(metres).toBeLessThan(111_700);
  });

  it('shrinks a degree of longitude by the cosine of the latitude', () => {
    const east = {lat: PIN.lat, lng: PIN.lng + 1};
    const metres = distanceInMeters(PIN, east);
    const expected = 111_195 * Math.cos((PIN.lat * Math.PI) / 180);
    expect(Math.abs(metres - expected)).toBeLessThan(600);
  });

  it('separates the two sides of the 200 m geofence', () => {
    // ~90 m north: inside the zone.
    const inside = {lat: PIN.lat + 0.0008, lng: PIN.lng};
    // ~440 m north: outside it.
    const outside = {lat: PIN.lat + 0.004, lng: PIN.lng};

    expect(distanceInMeters(PIN, inside)).toBeLessThan(200);
    expect(distanceInMeters(PIN, outside)).toBeGreaterThan(200);
  });

  it('returns whole metres, because the gate renders the number', () => {
    const d = distanceInMeters(PIN, {lat: 24.5941, lng: 73.7129});
    expect(Number.isInteger(d)).toBe(true);
  });
});
