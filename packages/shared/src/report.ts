export type ReportVatRow = {
  taxRateBps: number;
  htCents: number;
  taxCents: number;
  ttcCents: number;
};

export type ReportMonthRow = {
  month: string;
  label: string;
  htCents: number;
  taxCents: number;
  ttcCents: number;
  paidCents: number;
};

export type ReportUnpaidRow = {
  id: string;
  invoiceNumber: string | null;
  clientName: string;
  issueDate: string;
  dueDate: string;
  totalTtcCents: number;
  amountDueCents: number;
  status: string;
};

export type Report = {
  from: string;
  to: string;
  invoiceCount: number;
  creditNoteCount: number;
  paymentCount: number;
  htCents: number;
  taxCents: number;
  ttcCents: number;
  paidCents: number;
  creditedCents: number;
  dueCents: number;
  overdueCount: number;
  overdueCents: number;
  months: ReportMonthRow[];
  vat: ReportVatRow[];
  unpaid: ReportUnpaidRow[];
};
