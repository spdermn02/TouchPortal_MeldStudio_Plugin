import { DEBUG_MODE } from '../consts';

/**
 * Logger utility that respects DEBUG_MODE flag
 * Use this instead of direct tp.logIt("DEBUG", ...) calls
 */
export class Logger {
    private tp: any;
    private prefix: string;

    constructor(tp: any, prefix: string = '') {
        this.tp = tp;
        this.prefix = prefix;
    }

    /**
     * Log a debug message - only logs if DEBUG_MODE is enabled
     */
    debug(...args: any[]) {
        if (DEBUG_MODE) {
            const message = this.prefix ? `${this.prefix}: ${args.join(' ')}` : args.join(' ');
            this.tp.logIt("DEBUG", message);
        }
    }

    /**
     * Log an info message - always logs
     */
    info(...args: any[]) {
        const message = this.prefix ? `${this.prefix}: ${args.join(' ')}` : args.join(' ');
        this.tp.logIt("INFO", message);
    }

    /**
     * Log a warning message - always logs
     */
    warn(...args: any[]) {
        const message = this.prefix ? `${this.prefix}: ${args.join(' ')}` : args.join(' ');
        this.tp.logIt("WARN", message);
    }

    /**
     * Log an error message - always logs
     */
    error(...args: any[]) {
        const message = this.prefix ? `${this.prefix}: ${args.join(' ')}` : args.join(' ');
        this.tp.logIt("ERROR", message);
    }
}

/**
 * Simple debug log function for use outside of classes
 * Only logs if DEBUG_MODE is enabled
 */
export function debugLog(tp: any, ...args: any[]) {
    if (DEBUG_MODE) {
        tp.logIt("DEBUG", args.join(' '));
    }
}
