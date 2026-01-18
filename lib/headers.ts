export function filterHeaders(
  headers?: Record<string, string | undefined> | null
): Record<string, string> {
  const filtered: Record<string, string> = {};
  Object.entries(headers ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      filtered[key] = value;
    }
  });
  return filtered;
}
