/**
 * Validates that a URL uses only http: or https: protocol.
 * Prevents javascript:, data:, and other dangerous URI schemes.
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates all social/website URLs before form submission.
 * Returns the first invalid URL label, or null if all valid.
 */
export function findInvalidUrl(urls: { label: string; value: string }[]): string | null {
  for (const { label, value } of urls) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!isValidHttpUrl(trimmed)) {
      return label;
    }
  }
  return null;
}

/**
 * Sanitizes a URL for safe use in href attributes.
 * Returns the URL only if it uses http: or https:, otherwise returns '#'.
 */
export function sanitizeHref(url: string | null | undefined): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}
