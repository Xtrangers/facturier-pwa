import type { DiscountKind, ProductUnit, QuoteStatus } from "./enums";

export type QuoteLine = {
  id: string;
  productId: string | null;
  position: number;
  designation: string;
  description: string;
  quantity: number;
  unit: ProductUnit;
  unitPriceCents: number;
  discountKind: DiscountKind;
  discountValue: number;
  taxRateBps: number;
  lineHtCents: number;
  lineTaxCents: number;
  lineTtcCents: number;
};

export type QuoteLinePayload = {
  productId?: string | null;
  designation: string;
  description?: string;
  quantity: number;
  unit: ProductUnit;
  unitPriceCents: number;
  discountKind?: DiscountKind;
  discountValue?: number;
  taxRateBps: number;
};

export type Quote = {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  notes: string;
  terms: string;
  internalNotes: string;
  discountKind: DiscountKind;
  discountValue: number;
  travelFeeCents: number;
  travelFeeTaxRateBps: number;
  depositCents: number;
  linesHtCents: number;
  discountCents: number;
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  lines: QuoteLine[];
  createdAt: string;
  updatedAt: string;
};

export type QuotePayload = {
  clientId: string;
  issueDate?: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  internalNotes?: string;
  discountKind?: DiscountKind;
  discountValue?: number;
  travelFeeCents?: number;
  travelFeeTaxRateBps?: number;
  depositCents?: number;
  lines: QuoteLinePayload[];
};
