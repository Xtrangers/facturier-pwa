import type { CreditNoteKind, CreditNoteStatus } from "./enums";

export type CreditNote = {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  invoiceId: string;
  invoiceNumber: string | null;
  creditNumber: string | null;
  status: CreditNoteStatus;
  kind: CreditNoteKind;
  issueDate: string;
  reason: string;
  notes: string;
  taxRateBps: number;
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type CreditNotePayload = {
  invoiceId: string;
  kind: CreditNoteKind;
  reason: string;
  notes?: string;
  issueDate?: string;
  taxRateBps?: number;
  totalHtCents?: number;
};
