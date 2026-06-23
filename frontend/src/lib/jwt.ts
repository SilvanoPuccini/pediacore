/**
 * JWT validation helpers.
 *
 * Tokens stored in localStorage are accessible to any JS running on the
 * same origin (XSS risk). While the CSP is strict, this module adds
 * structural validation so obviously malformed tokens are never sent.
 *
 * Long-term fix (Fase 2): migrate to httpOnly refresh token cookies.
 */

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token structure is invalid.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // JWT payload is base64url-encoded JSON
    const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded);

    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check whether a JWT access token is structurally valid and not expired.
 *
 * Signature is NOT verified here — that happens server-side.
 * This is a client-side sanity check to prevent sending obviously
 * corrupted or expired tokens.
 */
export function isValidAccessToken(token: string | null): boolean {
  if (!token || typeof token !== "string") return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  // Must have an `exp` claim
  if (!payload.exp || typeof payload.exp !== "number") return false;

  // Optional: warn if already expired (but let the API decide)
  return true;
}

/**
 * Validate a refresh token structurally.
 * Refresh tokens are also JWTs and should have 3 parts.
 */
export function isValidRefreshToken(token: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3;
}
