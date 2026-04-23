/**
 * LOGGER UTILITY
 * Provides extensive console logging for debugging and monitoring app behavior
 */

const LogLevel = {
    INFO: 'INFO',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

const LogColors = {
    INFO: '#00d4ff',      // Neon blue
    SUCCESS: '#39ff14',   // Neon green
    WARNING: '#ffaa00',   // Orange
    ERROR: '#ff006e',     // Neon pink
    DEBUG: '#b026ff'      // Neon purple
};

class Logger {
    constructor(context = 'APP') {
        this.context = context;
        this.enabled = true;
    }

    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        return {
            timestamp,
            level,
            context: this.context,
            message,
            data
        };
    }

    _log(level, message, data = null) {
        if (!this.enabled) return;

        const color = LogColors[level];
        const formatted = this._formatMessage(level, message, data);
        
        console.group(
            `%c[${formatted.timestamp}] [${level}] [${this.context}]`,
            `color: ${color}; font-weight: bold;`
        );
        console.log(`%c${message}`, `color: ${color};`);
        if (data !== null) {
            console.log('Data:', data);
        }
        console.groupEnd();
    }

    info(message, data = null) {
        this._log(LogLevel.INFO, message, data);
    }

    success(message, data = null) {
        this._log(LogLevel.SUCCESS, message, data);
    }

    warning(message, data = null) {
        this._log(LogLevel.WARNING, message, data);
    }

    error(message, data = null) {
        this._log(LogLevel.ERROR, message, data);
    }

    debug(message, data = null) {
        this._log(LogLevel.DEBUG, message, data);
    }

    // Special methods for specific actions
    userAction(action, details = null) {
        this.info(`USER ACTION: ${action}`, details);
    }

    dataChange(operation, entity, data = null) {
        this.success(`DATA ${operation}: ${entity}`, data);
    }

    validation(field, status, message = null) {
        if (status === 'pass') {
            this.success(`VALIDATION PASSED: ${field}`, message);
        } else {
            this.warning(`VALIDATION FAILED: ${field}`, message);
        }
    }

    navigation(from, to) {
        this.info(`NAVIGATION: ${from} → ${to}`);
    }

    lifecycle(event, details = null) {
        this.debug(`LIFECYCLE: ${event}`, details);
    }
}

// Create default logger instances for different parts of the app
export const appLogger = new Logger('APP');
export const storeLogger = new Logger('STORE');
export const uiLogger = new Logger('UI');
export const validationLogger = new Logger('VALIDATION');

export default Logger;
