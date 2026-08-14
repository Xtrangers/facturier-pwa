export function formatEur(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function eurosToCents(input: string): number {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatTaxRate(bps: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bps / 100)} %`;
}

export function ttcFromHt(htCents: number, taxRateBps: number): number {
  return Math.round((htCents * (10_000 + taxRateBps)) / 10_000);
}

export function marginPercent(purchaseCents: number, saleCents: number): number | null {
  if (purchaseCents <= 0) return null;
  return Math.round(((saleCents - purchaseCents) / purchaseCents) * 1000) / 10;
}

export function formatMarginPercent(purchaseCents: number, saleCents: number): string {
  const pct = marginPercent(purchaseCents, saleCents);
  if (pct === null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(pct)} %`;
}

export function parseSiret(value: string): string {
  return value.replace(/\s/g, "");
}

export function isValidSiret(value: string): boolean {
  const digits = parseSiret(value);
  return digits.length === 0 || /^\d{14}$/.test(digits);
}
