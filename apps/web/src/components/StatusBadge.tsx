import type { ClientStatus, CreditNoteStatus, InvoiceStatus, ProductStatus, QuoteStatus } from "@facturier/shared";
import {
  CLIENT_STATUS_LABEL,
  CREDIT_NOTE_STATUS_LABEL,
  INVOICE_STATUS_LABEL,
  PRODUCT_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
} from "@facturier/shared";

const clientStyles: Record<ClientStatus, string> = {
  ACTIVE: "bg-teal-50 text-teal-800 ring-teal-100",
  INACTIVE: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  BLOCKED: "bg-red-50 text-red-700 ring-red-100",
};

const productStyles: Record<ProductStatus, string> = {
  ACTIVE: "bg-teal-50 text-teal-800 ring-teal-100",
  ARCHIVED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

const quoteStyles: Record<QuoteStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  SENT: "bg-teal-50 text-teal-800 ring-teal-100",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-100",
  ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  REJECTED: "bg-red-50 text-red-700 ring-red-100",
  EXPIRED: "bg-stone-100 text-stone-500 ring-stone-200",
  CONVERTED: "bg-sky-50 text-sky-800 ring-sky-100",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${clientStyles[status]}`}
    >
      {CLIENT_STATUS_LABEL[status]}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${productStyles[status]}`}
    >
      {PRODUCT_STATUS_LABEL[status]}
    </span>
  );
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${quoteStyles[status]}`}
    >
      {QUOTE_STATUS_LABEL[status]}
    </span>
  );
}

const invoiceStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  ISSUED: "bg-teal-50 text-teal-800 ring-teal-100",
  SENT: "bg-sky-50 text-sky-800 ring-sky-100",
  PARTIAL: "bg-amber-50 text-amber-800 ring-amber-100",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  OVERDUE: "bg-red-50 text-red-700 ring-red-100",
  CANCELLED: "bg-stone-100 text-stone-500 ring-stone-200",
  CREDITED: "bg-violet-50 text-violet-800 ring-violet-100",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${invoiceStyles[status]}`}>
      {INVOICE_STATUS_LABEL[status]}
    </span>
  );
}

export function CreditNoteStatusBadge({ status }: { status: CreditNoteStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        status === "ISSUED" ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-zinc-100 text-zinc-600 ring-zinc-200"
      }`}
    >
      {CREDIT_NOTE_STATUS_LABEL[status]}
    </span>
  );
}
