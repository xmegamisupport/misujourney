/** "" is treated as 0. Rejects negatives, decimals, and non-numeric input. */
export function parseNonNegativeInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function parsePositiveInt(value: string): number | null {
  const parsed = parseNonNegativeInt(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}
