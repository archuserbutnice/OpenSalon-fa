/**
 * Currency and Number Formatting Utilities
 * Standard: Base stored amounts are in Toman (integer).
 * Supports optional Rial display toggle (1 Toman = 10 Rials).
 * Supports Persian digit conversion (۰۱۲۳۴۵۶۷۸۹).
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert ASCII or Arabic digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  let str = String(input);
  // Replace Latin digits
  str = str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
  // Replace Arabic digits if any
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(ARABIC_DIGITS[i], 'g'), PERSIAN_DIGITS[i]);
  }
  return str;
}

/**
 * Convert Persian or Arabic digits to ASCII digits
 */
export function toAsciiDigits(input: string): string {
  if (!input) return '';
  let str = String(input);
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    str = str.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return str;
}

/**
 * Format thousands separator (e.g. 1,000,000 or ۱،۰۰۰،۰۰۰)
 */
export function formatThousands(amount: number, usePersianComma: boolean = true): string {
  const parts = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, usePersianComma ? '،' : ',');
  return parts;
}

export interface CurrencyFormatOptions {
  showRial?: boolean;        // If true, converts Toman to Rial (x10) and shows 'ریال'
  persianDigits?: boolean;   // Convert output digits to Persian (default true)
  includeUnit?: boolean;     // Append currency unit label (default true)
}

/**
 * Formats a Toman amount with proper unit and digits
 */
export function formatCurrency(
  amountInToman: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    showRial = false,
    persianDigits = true,
    includeUnit = true
  } = options;

  const value = showRial ? amountInToman * 10 : amountInToman;
  const unit = showRial ? 'ریال' : 'تومان';

  const formattedNum = formatThousands(value, true);
  const finalNum = persianDigits ? toPersianDigits(formattedNum) : formattedNum;

  return includeUnit ? `${finalNum} ${unit}` : finalNum;
}
