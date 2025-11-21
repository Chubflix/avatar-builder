/**
 * Debug Logger Utility
 * Set DEBUG_MODE=true in localStorage to enable debug logging
 * Usage: debug.log('component', 'message', data)
 */

const DEBUG_KEY = 'AVATAR_BUILDER_DEBUG';

class DebugLogger {
    constructor() {
        // Only access localStorage on client-side
        this.enabled = typeof window !== 'undefined' && localStorage.getItem(DEBUG_KEY) === 'true';
    }

    enable() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(DEBUG_KEY, 'true');
        this.enabled = true;
        console.log('%c[DEBUG] Debug mode enabled', 'color: green; font-weight: bold');
    }

    disable() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(DEBUG_KEY, 'false');
        this.enabled = false;
        console.log('%c[DEBUG] Debug mode disabled', 'color: red; font-weight: bold');
    }

    log(component, message, data = null) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `%c[${timestamp}] [${component}]%c ${message}`;

        if (data !== null && data !== undefined) {
            console.log(prefix, 'color: cyan; font-weight: bold', 'color: inherit', data);
        } else {
            console.log(prefix, 'color: cyan; font-weight: bold', 'color: inherit');
        }
    }

    error(component, message, error = null) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `%c[${timestamp}] [${component}]%c ${message}`;

        if (error) {
            console.error(prefix, 'color: red; font-weight: bold', 'color: inherit', error);
        } else {
            console.error(prefix, 'color: red; font-weight: bold', 'color: inherit');
        }
    }

    warn(component, message, data = null) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `%c[${timestamp}] [${component}]%c ${message}`;

        if (data !== null && data !== undefined) {
            console.warn(prefix, 'color: orange; font-weight: bold', 'color: inherit', data);
        } else {
            console.warn(prefix, 'color: orange; font-weight: bold', 'color: inherit');
        }
    }
}

const debug = new DebugLogger();

// Expose globally for easy enable/disable from console (client-side only)
if (typeof window !== 'undefined') {
    window.enableDebug = () => debug.enable();
    window.disableDebug = () => debug.disable();
}

export default debug;
