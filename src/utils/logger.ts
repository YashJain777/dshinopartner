 
const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log('[LOG]', ...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error('[ERROR]', ...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
};
