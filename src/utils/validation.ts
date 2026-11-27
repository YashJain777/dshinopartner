/**
 * Validation Utilities
 * Reusable input & schema validators
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid RFC 4122 UUID
 */
export const isUUID = (value: string): boolean => {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
};

/**
 * Filter an array of strings to only valid UUIDs
 */
export const filterValidUUIDs = (items: string[]): string[] => {
  if (!Array.isArray(items)) return [];
  return items.filter(isUUID);
};
