/** Money utilities — all amounts are integer cents internally. */

export function formatMoney(cents: number, currency = "CAD", locale = "en-CA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

/** Parse a user-entered dollar string ("$45.00", "45") into integer cents. */
export function dollarsToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

/** Convert integer cents to a plain dollar number (for form inputs). */
export function centsToDollars(cents: number): number {
  return Math.round(cents ?? 0) / 100;
}

/** The effective price for a product (sale price wins when present & lower). */
export function effectivePriceCents(priceCents: number, salePriceCents?: number | null): number {
  if (salePriceCents != null && salePriceCents > 0 && salePriceCents < priceCents) {
    return salePriceCents;
  }
  return priceCents;
}
