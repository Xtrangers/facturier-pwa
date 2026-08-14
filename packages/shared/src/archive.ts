export type ArchiveDocumentKind = "QUOTE" | "INVOICE" | "CREDIT_NOTE";

export type ArchiveDocument = {
  id: string;
  kind: ArchiveDocumentKind;
  number: string;
  clientId: string;
  clientName: string;
  status: string;
  issueDate: string;
  totalTtcCents: number;
  href: string;
};

export type ArchiveList = {
  items: ArchiveDocument[];
  total: number;
  totalTtcCents: number;
  quoteCount: number;
  invoiceCount: number;
  creditCount: number;
};

export const ARCHIVE_KIND_LABEL: Record<ArchiveDocumentKind, string> = {
  QUOTE: "Devis",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
};
