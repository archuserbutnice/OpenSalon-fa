/**
 * Iranian Mobile Phone Number Normalization and Validation
 * Standard Iranian format: 09xxxxxxxxx (11 digits, starting with 09)
 * International E.164: +989xxxxxxxxx (13 chars)
 */

import { toAsciiDigits } from './currency';

/**
 * Normalizes any valid Iranian mobile phone number to 09xxxxxxxxx.
 * Handles formats such as:
 * - "+989123456789" -> "09123456789"
 * - "00989123456789" -> "09123456789"
 * - "989123456789" -> "09123456789"
 * - "09123456789" -> "09123456789"
 * - "9123456789" -> "09123456789"
 * Converts Persian/Arabic digits, strips whitespace, hyphens, parentheses.
 * Returns null if invalid.
 */
export function normalizeIranianPhone(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // Convert Persian/Arabic digits to ASCII
  let cleaned = toAsciiDigits(rawPhone.trim());

  // Remove all non-digits except initial '+'
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // Strip international prefix variants
  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  // Final check: Must be 11 digits and start with '09'
  const iranianMobileRegex = /^09\d{9}$/;
  if (iranianMobileRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Normalizes phone to international E.164 format: +989xxxxxxxxx
 */
export function toInternationalIranianPhone(rawPhone: string): string | null {
  const local = normalizeIranianPhone(rawPhone);
  if (!local) return null;
  // Replace leading 0 with +98
  return '+98' + local.slice(1);
}

/**
 * Returns true if input is a valid Iranian mobile number
 */
export function isValidIranianMobile(rawPhone: string): boolean {
  return normalizeIranianPhone(rawPhone) !== null;
}
