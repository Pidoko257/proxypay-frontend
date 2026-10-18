/**
 * TimeZone Selector Component
 * Allows users to select their preferred timezone for displaying timestamps
 */

import React, { useState, useMemo } from 'react';

export type TimeZoneFormat = 'local' | 'utc' | 'custom';

export interface TimeZoneSelectorProps {
  selectedTimezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  compact?: boolean;
}

/**
 * Get list of common timezones
 */
function getCommonTimezones(): string[] {
  const zones = [
    // UTC
    'UTC',
    
    // Americas
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Phoenix',
    'America/Toronto',
    'America/Mexico_City',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    
    // Europe
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Europe/Vienna',
    'Europe/Prague',
    'Europe/Warsaw',
    'Europe/Moscow',
    'Europe/Istanbul',
    
    // Africa
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Casablanca',
    
    // Asia
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    
    // Australia/Pacific
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Pacific/Auckland',
    'Pacific/Fiji',
  ];
  
  return zones;
}

/**
 * Detect user's system timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Format date in a specific timezone
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
    };
    
    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      ...options,
    }).format(new Date(date));
  } catch (error) {
    console.warn(`Invalid timezone: ${timezone}`, error);
    return new Date(date).toLocaleString();
  }
}

/**
 * Get offset for timezone for display
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(new Date());
    const tzNamePart = parts.find(p => p.type === 'timeZoneName');
    return tzNamePart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * TimeZone Selector Component
 */
export const TimeZoneSelector: React.FC<TimeZoneSelectorProps> = ({
  selectedTimezone = detectUserTimezone(),
  onTimezoneChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timezones = useMemo(() => getCommonTimezones(), []);
  const displayName = getTimezoneOffset(selectedTimezone);

  const handleSelect = (tz: string) => {
    onTimezoneChange?.(tz);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="timezone-selector compact">
        <select
          value={selectedTimezone}
          onChange={(e) => handleSelect(e.target.value)}
          title="Select timezone"
          aria-label="Timezone selector"
        >
          {timezones.map(tz => (
            <option key={tz} value={tz}>
              {tz} ({getTimezoneOffset(tz)})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="timezone-selector">
      <button
        className="timezone-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Current timezone: ${displayName}`}
        title={selectedTimezone}
      >
        <span className="timezone-icon">🕐</span>
        <span className="timezone-label">{displayName}</span>
        <span className="timezone-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="timezone-dropdown">
          <div className="timezone-search-container">
            <input
              type="text"
              placeholder="Search timezone..."
              className="timezone-search"
              onChange={(e) => {
                // Filter logic would be here if needed
              }}
              autoFocus
            />
          </div>
          <div className="timezone-list">
            {timezones.map(tz => (
              <button
                key={tz}
                className={`timezone-option ${tz === selectedTimezone ? 'selected' : ''}`}
                onClick={() => handleSelect(tz)}
              >
                <span className="tz-name">{tz}</span>
                <span className="tz-offset">{getTimezoneOffset(tz)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeZoneSelector;
