/**
 * Jalali (Solar Hijri) Date Conversion and Calendar Utilities
 * Accurate algorithmic conversion between Gregorian and Jalali calendars.
 * Standard Iranian week: Starts on Saturday (Shanbeh), ends on Friday (Jomeh - weekend).
 */

import { toPersianDigits, toAsciiDigits } from './currency';

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface CalendarDayCell {
  date: Date;
  jalali: JalaliDate;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSelected: boolean;
}

export const JALALI_MONTH_NAMES_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const JALALI_MONTH_NAMES_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
];

export const WEEKDAY_NAMES_FA = [
  'شنبه',        // Shanbeh (Saturday - Start of week)
  'یکشنبه',      // Yekshanbeh (Sunday)
  'دوشنبه',      // Doshanbeh (Monday)
  'سه‌شنبه',     // Seshanbeh (Tuesday)
  'چهارشنبه',    // Chaharshanbeh (Wednesday)
  'پنج‌شنبه',    // Panjshanbeh (Thursday)
  'جمعه'         // Jomeh (Friday - Weekend)
];

export const WEEKDAY_NAMES_SHORT_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Converts Gregorian date to Jalali (Solar Hijri)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date to Gregorian
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let jy2 = jy + 1595;
  let days = -355668 + (365 * jy2) + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    let v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

/**
 * Checks whether a given Jalali year is a leap year (kabiseh)
 */
export function isJalaliLeapYear(jy: number): boolean {
  // A year is a leap year if Farvardin 1 of next year is 366 days after Farvardin 1 of this year
  const g1 = jalaliToGregorian(jy, 1, 1);
  const g2 = jalaliToGregorian(jy + 1, 1, 1);
  const d1 = new Date(Date.UTC(g1.gy, g1.gm - 1, g1.gd));
  const d2 = new Date(Date.UTC(g2.gy, g2.gm - 1, g2.gd));
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays === 366;
}

/**
 * Returns number of days in a given Jalali month (1-12)
 */
export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) throw new Error(`Invalid Jalali month: ${jm}`);
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/**
 * Returns Iranian day index (0 = Shanbeh/Saturday ... 6 = Jomeh/Friday)
 */
export function getIranianDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0 is Sunday, 6 is Saturday
  return (jsDay + 1) % 7;
}

/**
 * Returns whether given date is weekend (Friday in Iran)
 */
export function isIranianWeekend(date: Date): boolean {
  return getIranianDayOfWeek(date) === 6;
}

/**
 * Checks whether two Date objects fall on the same Jalali day
 */
export function isSameJalaliDay(d1: Date, d2: Date): boolean {
  const j1 = gregorianToJalali(d1.getFullYear(), d1.getMonth() + 1, d1.getDate());
  const j2 = gregorianToJalali(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
  return j1.jy === j2.jy && j1.jm === j2.jm && j1.jd === j2.jd;
}

/**
 * Format Date object to Jalali string YYYY/MM/DD
 */
export function formatJalaliDate(date: Date, delimiter: string = '/', persianDigits: boolean = true): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const mm = String(j.jm).padStart(2, '0');
  const dd = String(j.jd).padStart(2, '0');
  const str = `${j.jy}${delimiter}${mm}${delimiter}${dd}`;
  return persianDigits ? toPersianDigits(str) : str;
}

/**
 * Format Date object to full Persian text e.g. "شنبه ۲۵ فروردین ۱۴۰۳"
 */
export function formatJalaliFullText(date: Date, persianDigits: boolean = true): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const dayName = WEEKDAY_NAMES_FA[getIranianDayOfWeek(date)];
  const monthName = JALALI_MONTH_NAMES_FA[j.jm - 1];
  const dayNum = persianDigits ? toPersianDigits(j.jd) : j.jd;
  const yearNum = persianDigits ? toPersianDigits(j.jy) : j.jy;
  return `${dayName} ${dayNum} ${monthName} ${yearNum}`;
}

/**
 * Parses a Jalali date string (e.g. "1403/08/25" or "۱۴۰۳-۰۸-۲۵") to Date object
 */
export function parseJalaliDate(input: string): Date | null {
  if (!input || typeof input !== 'string') return null;
  const ascii = toAsciiDigits(input.trim());
  const match = ascii.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  if (jm < 1 || jm > 12) return null;
  const maxDays = getDaysInJalaliMonth(jy, jm);
  if (jd < 1 || jd > maxDays) return null;

  const g = jalaliToGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

/**
 * Adds or subtracts days from a Date object
 */
export function addJalaliDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds or subtracts months from a Jalali year/month
 */
export function addJalaliMonths(jy: number, jm: number, count: number): { jy: number; jm: number } {
  let totalMonths = jy * 12 + (jm - 1) + count;
  let newYear = Math.floor(totalMonths / 12);
  let newMonth = (totalMonths % 12) + 1;
  return { jy: newYear, jm: newMonth };
}

/**
 * Relative Jalali date formatting e.g. "امروز", "دیروز", "فردا", "۳ روز قبل"
 */
export function formatJalaliRelative(targetDate: Date, baseDate: Date = new Date(), persianDigits: boolean = true): string {
  const t = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const b = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffTime = t.getTime() - b.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'امروز';
  if (diffDays === -1) return 'دیروز';
  if (diffDays === 1) return 'فردا';
  if (diffDays === 2) return 'پس‌فردا';

  if (diffDays < 0) {
    const d = Math.abs(diffDays);
    return `${persianDigits ? toPersianDigits(d) : d} روز قبل`;
  } else {
    return `${persianDigits ? toPersianDigits(diffDays) : diffDays} روز بعد`;
  }
}

/**
 * Generates full calendar grid matrix (weeks × 7 days) for a given Jalali month
 */
export function getJalaliMonthGrid(jy: number, jm: number, selectedDate?: Date): CalendarDayCell[][] {
  const daysInMonth = getDaysInJalaliMonth(jy, jm);
  const firstDayGregorian = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
  const startDayOfWeek = getIranianDayOfWeek(firstDate); // 0 (Shanbeh) .. 6 (Jomeh)

  const today = new Date();
  const grid: CalendarDayCell[][] = [];
  let currentWeek: CalendarDayCell[] = [];

  // Trailing days from previous month
  const prevMonth = addJalaliMonths(jy, jm, -1);
  const daysInPrevMonth = getDaysInJalaliMonth(prevMonth.jy, prevMonth.jm);
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevJd = daysInPrevMonth - i;
    const g = jalaliToGregorian(prevMonth.jy, prevMonth.jm, prevJd);
    const d = new Date(g.gy, g.gm - 1, g.gd);
    currentWeek.push({
      date: d,
      jalali: { jy: prevMonth.jy, jm: prevMonth.jm, jd: prevJd },
      dayNumber: prevJd,
      isCurrentMonth: false,
      isToday: isSameJalaliDay(d, today),
      isWeekend: isIranianWeekend(d),
      isSelected: selectedDate ? isSameJalaliDay(d, selectedDate) : false
    });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const g = jalaliToGregorian(jy, jm, day);
    const d = new Date(g.gy, g.gm - 1, g.gd);
    currentWeek.push({
      date: d,
      jalali: { jy, jm, jd: day },
      dayNumber: day,
      isCurrentMonth: true,
      isToday: isSameJalaliDay(d, today),
      isWeekend: isIranianWeekend(d),
      isSelected: selectedDate ? isSameJalaliDay(d, selectedDate) : false
    });

    if (currentWeek.length === 7) {
      grid.push(currentWeek);
      currentWeek = [];
    }
  }

  // Leading days of next month to complete the row
  if (currentWeek.length > 0) {
    const nextMonth = addJalaliMonths(jy, jm, 1);
    let nextJd = 1;
    while (currentWeek.length < 7) {
      const g = jalaliToGregorian(nextMonth.jy, nextMonth.jm, nextJd);
      const d = new Date(g.gy, g.gm - 1, g.gd);
      currentWeek.push({
        date: d,
        jalali: { jy: nextMonth.jy, jm: nextMonth.jm, jd: nextJd },
        dayNumber: nextJd,
        isCurrentMonth: false,
        isToday: isSameJalaliDay(d, today),
        isWeekend: isIranianWeekend(d),
        isSelected: selectedDate ? isSameJalaliDay(d, selectedDate) : false
      });
      nextJd++;
    }
    grid.push(currentWeek);
  }

  return grid;
}

/**
 * Returns available appointment time slots in a day e.g. ["۰۹:۰۰", "۰۹:۳۰", ...]
 */
export function getDailyTimeSlots(
  startHour: number = 9,
  endHour: number = 20,
  intervalMinutes: number = 30,
  persianDigits: boolean = true
): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      const hStr = String(hour).padStart(2, '0');
      const mStr = String(min).padStart(2, '0');
      const timeStr = `${hStr}:${mStr}`;
      slots.push(persianDigits ? toPersianDigits(timeStr) : timeStr);
    }
  }
  return slots;
}
