export function parsePairingQr(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    if (typeof parsed.token === "string")
      return parsed.token.trim() || undefined;
  } catch {
    return raw.trim() || undefined;
  }
  return undefined;
}
