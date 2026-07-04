/**
 * Token/reference generation on WebCrypto (globalThis.crypto), which exists
 * in both Node 18+ and Cloudflare Workers — no node:crypto dependency.
 */

/** URL-safe, high-entropy token for customer booking-management links. */
export function generateManageToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

function randomCode(length: number): string {
  // Rejection sampling keeps the alphabet distribution uniform (256 % 31 != 0).
  const limit = 256 - (256 % REF_ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit) {
        out += REF_ALPHABET[b % REF_ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

/** Human-friendly booking reference, e.g. "JM-7F3K2A". */
export function generateBookingReference(): string {
  return `JM-${randomCode(6)}`;
}

/** Human-friendly order reference, e.g. "ORD-9K2H4P". */
export function generateOrderReference(): string {
  return `ORD-${randomCode(6)}`;
}
