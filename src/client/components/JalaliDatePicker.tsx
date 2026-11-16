import { useState } from 'preact/hooks';
import {
  gregorianToJalali,
  getJalaliMonthGrid,
  addJalaliMonths,
  JALALI_MONTH_NAMES_FA,
  WEEKDAY_NAMES_SHORT_FA,
  CalendarDayCell,
  formatJalaliFullText,
  formatJalaliDate
} from '../lib/jalali';
import { toPersianDigits } from '../lib/currency';

interface JalaliDatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  label?: string;
  minDate?: Date;
}

export function JalaliDatePicker({ value = new Date(), onChange, label }: JalaliDatePickerProps) {
  const initialJalali = gregorianToJalali(value.getFullYear(), value.getMonth() + 1, value.getDate());
  const [currentYear, setCurrentYear] = useState<number>(initialJalali.jy);
  const [currentMonth, setCurrentMonth] = useState<number>(initialJalali.jm);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const monthGrid = getJalaliMonthGrid(currentYear, currentMonth, value);

  const handlePrevMonth = (e: any) => {
    e.stopPropagation();
    const prev = addJalaliMonths(currentYear, currentMonth, -1);
    setCurrentYear(prev.jy);
    setCurrentMonth(prev.jm);
  };

  const handleNextMonth = (e: any) => {
    e.stopPropagation();
    const next = addJalaliMonths(currentYear, currentMonth, 1);
    setCurrentYear(next.jy);
    setCurrentMonth(next.jm);
  };

  const handleSelectDay = (cell: CalendarDayCell) => {
    if (onChange) {
      onChange(cell.date);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-right w-full sm:w-auto">
      {label && <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="font-medium">{formatJalaliDate(value)}</span>
          <span className="text-xs text-slate-500 hidden sm:inline">({formatJalaliFullText(value)})</span>
        </div>
        <span className="text-slate-400 text-xs">▼</span>
      </button>

      {/* Popover / Calendar Modal */}
      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 select-none">
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
              title="ماه قبل"
            >
              ▶
            </button>

            <div className="text-sm font-bold text-slate-800">
              {JALALI_MONTH_NAMES_FA[currentMonth - 1]} {toPersianDigits(currentYear)}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
              title="ماه بعد"
            >
              ◀
            </button>
          </div>

          {/* Weekday Names Header (Shanbeh start, Jomeh weekend) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAY_NAMES_SHORT_FA.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-xs font-semibold py-1 ${idx === 6 ? 'text-red-500 font-bold' : 'text-slate-500'}`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="space-y-1">
            {monthGrid.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1">
                {week.map((cell) => {
                  let btnClass = 'text-xs h-8 rounded-lg flex items-center justify-center transition font-medium ';
                  if (cell.isSelected) {
                    btnClass += 'bg-pink-600 text-white font-bold shadow ';
                  } else if (cell.isToday) {
                    btnClass += 'border border-pink-400 text-pink-700 bg-pink-50 ';
                  } else if (!cell.isCurrentMonth) {
                    btnClass += 'text-slate-300 hover:bg-slate-50 ';
                  } else if (cell.isWeekend) {
                    btnClass += 'text-red-600 hover:bg-red-50 ';
                  } else {
                    btnClass += 'text-slate-700 hover:bg-slate-100 ';
                  }

                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      onClick={() => handleSelectDay(cell)}
                      className={btnClass}
                    >
                      {toPersianDigits(cell.dayNumber)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer Quick Action */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const nowJ = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
                setCurrentYear(nowJ.jy);
                setCurrentMonth(nowJ.jm);
                if (onChange) onChange(now);
                setIsOpen(false);
              }}
              className="text-pink-600 hover:text-pink-800 font-medium"
            >
              برو به امروز
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
