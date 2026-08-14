import type { DiscountKind, InvoiceStatus, ProductUnit } from "./enums";
import type { QuoteLine } from "./quote";

export type InvoiceLine = QuoteLine;

export type InvoiceLinePayload = {
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

export type Invoice = {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  clientEmail: string;
  quoteId: string | null;
  quoteNumber: string | null;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
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
  amountPaidCents: number;
  creditedCents: number;
  amountDueCents: number;
  pdfUrl: string;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type InvoicePayload = {
  clientId: string;
  quoteId?: string | null;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
  internalNotes?: string;
  discountKind?: DiscountKind;
  discountValue?: number;
  travelFeeCents?: number;
  travelFeeTaxRateBps?: number;
  depositCents?: number;
  lines: InvoiceLinePayload[];
};

export type Payment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  clientId: string;
  clientName: string;
  amountCents: number;
  method: string;
  paidAt: string;
  reference: string;
  notes: string;
  createdAt: string;
};

export type PaymentPayload = {
  invoiceId?: string;
  amountCents: number;
  method: string;
  paidAt?: string;
  reference?: string;
  notes?: string;
};

export type PaymentList = {
  items: Payment[];
  total: number;
  totalCents: number;
};

export type OpenInvoice = {
  id: string;
  invoiceNumber: string | null;
  clientName: string;
  amountDueCents: number;
  dueDate: string;
};
