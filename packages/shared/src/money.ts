export function formatEur(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function parseSiret(value: string): string {
  return value.replace(/\s/g, "");
}

export function isValidSiret(value: string): boolean {
  const digits = parseSiret(value);
  return digits.length === 0 || /^\d{14}$/.test(digits);
}
