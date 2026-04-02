const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d|w)?$/i;

const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

export function durationToMs(duration: string): number {
  const normalized = duration.trim();
  const match = normalized.match(DURATION_PATTERN);

  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }

  const [, value, unit = 'ms'] = match;
  return Number(value) * UNIT_TO_MS[unit.toLowerCase()];
}
