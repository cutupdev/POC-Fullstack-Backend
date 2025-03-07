import log4js from 'log4js';

function generateLogFileName(prefix: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${prefix}-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.txt`;
}

const errorLogFileName = `logs/error/${generateLogFileName('error')}`;
const logLogFileName = `logs/debug/${generateLogFileName('log')}`;
const authLogFileName = `logs/auth/${generateLogFileName('auth')}`;

log4js.configure({
    appenders: {
        console: { type: 'console' },
        auth: { type: 'file', filename: authLogFileName },
        log: { type: 'file', filename: logLogFileName },
        error: { type: 'file', filename: errorLogFileName }
    },
    categories: {
        default: { appenders: ['console'], level: 'debug' },
        auth: { appenders: ['auth'], level: 'info' },
        log: { appenders: ['log'], level: 'debug' },
        error: { appenders: ['error'], level: 'error' }
    }
});

export const defaultLogger = log4js.getLogger();
export const authLogger = log4js.getLogger('auth');
export const logLogger = log4js.getLogger('log');
export const errorLogger = log4js.getLogger('error');