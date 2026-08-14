import type { DiscountKind } from "./enums";

export type LineInput = {
  quantity: number;
  unitPriceCents: number;
  discountKind: DiscountKind;
  discountValue: number;
  taxRateBps: number;
};

export type ComputedLine = {
  rawHtCents: number;
  lineDiscountCents: number;
  lineHtCents: number;
  lineTaxCents: number;
  lineTtcCents: number;
};

export function parseQuantity(input: string): number {
  const n = Number(input.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function formatQuantity(qty: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(qty);
}

export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("fr-FR").format(new Date(y, m - 1, d));
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function computeLine(input: LineInput): ComputedLine {
  const rawHtCents = Math.max(0, Math.round(input.quantity * input.unitPriceCents));
  let lineHtCents = rawHtCents;
  if (input.discountKind === "PERCENT") {
    const pct = Math.min(100, Math.max(0, input.discountValue));
    lineHtCents = Math.round((rawHtCents * (100 - pct)) / 100);
  } else if (input.discountKind === "AMOUNT") {
    lineHtCents = Math.max(0, rawHtCents - Math.max(0, input.discountValue));
  }
  const lineDiscountCents = rawHtCents - lineHtCents;
  const lineTaxCents = Math.round((lineHtCents * input.taxRateBps) / 10_000);
  return {
    rawHtCents,
    lineDiscountCents,
    lineHtCents,
    lineTaxCents,
    lineTtcCents: lineHtCents + lineTaxCents,
  };
}

export type QuoteTotalsInput = {
  lines: LineInput[];
  travelFeeCents: number;
  travelFeeTaxRateBps: number;
  discountKind: DiscountKind;
  discountValue: number;
};

export type QuoteTotals = {
  linesHtCents: number;
  travelHtCents: number;
  travelTaxCents: number;
  discountCents: number;
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  lines: ComputedLine[];
};

export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const computedLines = input.lines.map(computeLine);
  const travelHtCents = Math.max(0, input.travelFeeCents);
  const travelTaxCents = Math.round((travelHtCents * input.travelFeeTaxRateBps) / 10_000);
  const linesHtCents = computedLines.reduce((sum, line) => sum + line.lineHtCents, 0);
  const linesTaxCents = computedLines.reduce((sum, line) => sum + line.lineTaxCents, 0);
  const subtotalHt = linesHtCents + travelHtCents;

  let discountCents = 0;
  if (input.discountKind === "PERCENT") {
    const pct = Math.min(100, Math.max(0, input.discountValue));
    discountCents = Math.round((subtotalHt * pct) / 100);
  } else if (input.discountKind === "AMOUNT") {
    discountCents = Math.min(subtotalHt, Math.max(0, input.discountValue));
  }

  const totalHtCents = subtotalHt - discountCents;
  const subtotalTax = linesTaxCents + travelTaxCents;
  const totalTaxCents = subtotalHt === 0 ? 0 : Math.round((subtotalTax * totalHtCents) / subtotalHt);

  return {
    linesHtCents,
    travelHtCents,
    travelTaxCents,
    discountCents,
    totalHtCents,
    totalTaxCents,
    totalTtcCents: totalHtCents + totalTaxCents,
    lines: computedLines,
  };
}
