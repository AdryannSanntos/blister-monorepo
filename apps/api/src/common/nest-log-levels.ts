import type { LogLevel } from '@nestjs/common';

const ALLOWED_LEVELS: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

export const resolveNestLogLevels = (): LogLevel[] => {
  const raw = process.env.NEST_LOG_LEVEL ?? 'error,warn,log';
  const levels = raw
    .split(',')
    .map((level) => level.trim())
    .filter((level): level is LogLevel => ALLOWED_LEVELS.includes(level as LogLevel));

  return levels.length > 0 ? levels : ['error', 'warn'];
};
