// Audio utility functions for gain/dB conversions

/**
 * Convert linear gain (0.0-1.0) to decibels
 * @param gain Linear gain value (0.0 to 1.0)
 * @returns Decibel value (-Infinity to 0)
 */
export function toDb(gain: number): number {
    if (gain <= 0) return -Infinity;
    return 20 * Math.log10(gain);
}

/**
 * Convert decibels to linear gain
 * @param dB Decibel value
 * @returns Linear gain value (0.0 to 1.0)
 */
export function toGain(dB: number): number {
    if (dB === -Infinity || dB < -100) return 0;
    return Math.pow(10, dB / 20);
}

/**
 * Clamp gain value to valid range (0.0-1.0)
 * @param gain Gain value to clamp
 * @returns Clamped gain value
 */
export function clampGain(gain: number): number {
    return Math.max(0, Math.min(1, gain));
}

/**
 * Format gain as a percentage string
 * @param gain Linear gain value
 * @returns Percentage as string (e.g., "75")
 */
export function gainToPercent(gain: number): string {
    return Math.round(gain * 100).toString();
}

/**
 * Format dB value as string, handling -Infinity
 * @param dB Decibel value
 * @returns Formatted string (e.g., "-6.0" or "-inf")
 */
export function formatDb(dB: number): string {
    if (dB === -Infinity) return '-inf';
    return dB.toFixed(1);
}
