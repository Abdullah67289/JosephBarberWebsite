import { randomBytes, randomInt } from "crypto";

/** URL-safe, high-entropy token for customer booking-management links. */
export function generateManageToken(): string {
  return randomBytes(32).toString("base64url");
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)];
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
