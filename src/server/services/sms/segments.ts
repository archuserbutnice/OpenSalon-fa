import { SmsSegmentCalculation } from './types';

/**
 * Checks if the text contains any non-GSM7 / Persian / Arabic characters.
 */
export function isPersianOrUnicode(text: string): boolean {
  // Regex matches Persian/Arabic alphabet, Persian digits, and general non-ASCII Unicode
  return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\u0750-\u077F]/.test(text) || /[^\x00-\x7F]/.test(text);
}

/**
 * Calculates Persian and GSM SMS segments according to Iranian telecom standards.
 * - Persian/Unicode: 70 chars for single part, 67 chars per part for multi-part (UDH overhead).
 * - Latin/GSM-7: 160 chars for single part, 153 chars per part for multi-part.
 */
export function countSmsSegments(text: string): SmsSegmentCalculation {
  if (!text || text.length === 0) {
    return {
      isPersian: false,
      characterCount: 0,
      segments: 0,
      maxCharsPerSegment: 160,
      charsLeftInSegment: 160
    };
  }

  const isPersian = isPersianOrUnicode(text);
  const length = text.length;

  if (isPersian) {
    if (length <= 70) {
      return {
        isPersian: true,
        characterCount: length,
        segments: 1,
        maxCharsPerSegment: 70,
        charsLeftInSegment: 70 - length
      };
    }
    const segments = Math.ceil(length / 67);
    const charsLeft = (segments * 67) - length;
    return {
      isPersian: true,
      characterCount: length,
      segments,
      maxCharsPerSegment: 67,
      charsLeftInSegment: charsLeft
    };
  } else {
    if (length <= 160) {
      return {
        isPersian: false,
        characterCount: length,
        segments: 1,
        maxCharsPerSegment: 160,
        charsLeftInSegment: 160 - length
      };
    }
    const segments = Math.ceil(length / 153);
    const charsLeft = (segments * 153) - length;
    return {
      isPersian: false,
      characterCount: length,
      segments,
      maxCharsPerSegment: 153,
      charsLeftInSegment: charsLeft
    };
  }
}
