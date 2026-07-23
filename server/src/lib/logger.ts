import { isTest } from '../config/env';

type Level = 'info' | 'warn' | 'error';

interface LogPayload {
  [key: string]: unknown;
}

function write(level: Level, message: string, payload?: LogPayload): void {
  if (isTest) return;
  const entry = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...payload,
  });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

/** Minimal structured logger — JSON lines are what Render and most log drains expect. */
export const logger = {
  info: (message: string, payload?: LogPayload) => write('info', message, payload),
  warn: (message: string, payload?: LogPayload) => write('warn', message, payload),
  error: (message: string, payload?: LogPayload) => write('error', message, payload),
};
