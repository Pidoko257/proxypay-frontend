import React, { useMemo, useRef, useState } from 'react';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'last90' | 'custom';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

interface DateRangePickerProps {
  initialValue?: Partial<DateRangeValue>;
  onChange?: (value: DateRangeValue) => void;
  label?: string;
  id?: string;
}

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'last90', label: 'Last 90 Days' },
  { id: 'custom', label: 'Custom' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const formatDisplayDate = (value: string): string =>
  fromIsoDate(value).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const getPresetRange = (preset: DateRangePreset, anchorDate: Date = new Date()): DateRangeValue => {
  const today = startOfDay(anchorDate);

  switch (preset) {
    case 'today':
      return { startDate: toIsoDate(today), endDate: toIsoDate(today), preset: 'today' };
    case 'last7':
      return {
        startDate: toIsoDate(addDays(today, -6)),
        endDate: toIsoDate(today),
        preset: 'last7',
      };
    case 'last30':
      return {
        startDate: toIsoDate(addDays(today, -29)),
        endDate: toIsoDate(today),
        preset: 'last30',
      };
    case 'last90':
      return {
        startDate: toIsoDate(addDays(today, -89)),
        endDate: toIsoDate(today),
        preset: 'last90',
      };
    default:
      return { startDate: toIsoDate(today), endDate: toIsoDate(today), preset: 'custom' };
  }
};

export default function DateRangePicker({
  initialValue,
  onChange,
  label = 'Date range',
  id = 'date-range-picker',
}: DateRangePickerProps): React.JSX.Element {
  const defaultValue = useMemo(() => getPresetRange('last30'), []);
  const [selection, setSelection] = useState<DateRangeValue>({
    startDate: initialValue?.startDate ?? defaultValue.startDate,
    endDate: initialValue?.endDate ?? defaultValue.endDate,
    preset: initialValue?.preset ?? 'last30',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => fromIsoDate(selection.startDate));
  const [pickingEndDate, setPickingEndDate] = useState(false);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const commitSelection = (nextValue: DateRangeValue): void => {
    setSelection(nextValue);
    onChange?.(nextValue);
  };

  const applyPreset = (preset: DateRangePreset): void => {
    const nextValue = preset === 'custom'
      ? { ...selection, preset: 'custom' }
      : getPresetRange(preset);

    commitSelection(nextValue);
    setPickingEndDate(false);
    setViewDate(fromIsoDate(nextValue.endDate));
  };

  const handleDaySelect = (day: Date): void => {
    const nextIsoDate = toIsoDate(day);

    if (!pickingEndDate) {
      commitSelection({ startDate: nextIsoDate, endDate: nextIsoDate, preset: 'custom' });
      setViewDate(day);
      setPickingEndDate(true);
      return;
    }

    const startDate = fromIsoDate(selection.startDate);
    if (day < startDate) {
      commitSelection({ startDate: nextIsoDate, endDate: nextIsoDate, preset: 'custom' });
      setViewDate(day);
      setPickingEndDate(true);
      return;
    }

    commitSelection({ startDate: selection.startDate, endDate: nextIsoDate, preset: 'custom' });
    setViewDate(day);
    setPickingEndDate(false);
  };

  const focusDayButton = (day: Date): void => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    dayButtonRefs.current[key]?.focus();
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, day: Date): void => {
    const currentDate = day;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusDayButton(addDays(currentDate, 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusDayButton(addDays(currentDate, -1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusDayButton(addDays(currentDate, 7));
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusDayButton(addDays(currentDate, -7));
        break;
      default:
        break;
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstVisibleDay = new Date(firstDayOfMonth);
    firstVisibleDay.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDay, index));
  }, [viewDate]);

  const isInRange = (day: Date): boolean => {
    const dayValue = toIsoDate(day);
    return dayValue >= selection.startDate && dayValue <= selection.endDate;
  };

  const isRangeStart = (day: Date): boolean => toIsoDate(day) === selection.startDate;
  const isRangeEnd = (day: Date): boolean => toIsoDate(day) === selection.endDate;

  return (
    <div className="date-range-picker">
      <div className="date-range-picker__label-row">
        <span className="date-range-picker__label">{label}</span>
        <button
          type="button"
          className="date-range-picker__trigger"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls={`${id}-popover`}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>{formatDisplayDate(selection.startDate)} – {formatDisplayDate(selection.endDate)}</span>
        </button>
      </div>

      <div className="date-range-picker__preset-row" role="group" aria-label="Preset date ranges">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`date-range-picker__preset${selection.preset === preset.id ? ' is-active' : ''}`}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {isOpen ? (
        <div
          id={`${id}-popover`}
          className="date-range-picker__popover"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-title`}
        >
          <h3 id={`${id}-title`} className="date-range-picker__popover-title">
            {pickingEndDate ? 'Choose an end date' : 'Choose a start date'}
          </h3>
          <p className="date-range-picker__hint">
            {pickingEndDate
              ? 'Select the end date in the calendar.'
              : 'Select the start date to begin a custom range.'}
          </p>

          <div className="date-range-picker__calendar-nav" aria-label="Month navigation">
            <button
              type="button"
              className="date-range-picker__nav-button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              aria-label="Show previous month"
            >
              ‹
            </button>
            <span className="date-range-picker__month-label">
              {viewDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              className="date-range-picker__nav-button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              aria-label="Show next month"
            >
              ›
            </button>
          </div>

          <div className="date-range-picker__weekdays" role="presentation">
            {DAY_NAMES.map((dayName) => (
              <span key={dayName} className="date-range-picker__weekday">
                {dayName}
              </span>
            ))}
          </div>

          <div className="date-range-picker__grid" role="grid" aria-label="Calendar days">
            {calendarDays.map((day) => {
              const dayValue = toIsoDate(day);
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = isInRange(day);
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);

              return (
                <button
                  key={dayValue}
                  ref={(node) => {
                    const keyName = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                    dayButtonRefs.current[keyName] = node;
                  }}
                  type="button"
                  className={[
                    'date-range-picker__day',
                    !isCurrentMonth ? 'is-muted' : '',
                    isSelected ? 'is-selected' : '',
                    isStart ? 'is-start' : '',
                    isEnd ? 'is-end' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleDaySelect(day)}
                  onKeyDown={(event) => handleDayKeyDown(event, day)}
                  aria-label={`Select ${formatDisplayDate(dayValue)}`}
                  aria-pressed={isSelected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
