export type MailKind = "QUOTE" | "INVOICE" | "CREDIT_NOTE" | "REMINDER";

export type MailStatus = "SENT" | "FAILED";

export type MailLog = {
  id: string;
  kind: MailKind;
  quoteId: string | null;
  invoiceId: string | null;
  creditNoteId: string | null;
  reminderId: string | null;
  toEmail: string;
  subject: string;
  body: string;
  status: MailStatus;
  transport: "smtp" | "file";
  error: string;
  pdfFilename: string;
  createdAt: string;
};

export type MailPayload = {
  to?: string;
  subject?: string;
  message?: string;
};

export type ReminderMailPayload = MailPayload & {
  invoiceId?: string;
  quoteId?: string;
  level: 1 | 2 | 3;
};

export const MAIL_KIND_LABEL: Record<MailKind, string> = {
  QUOTE: "Devis",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  REMINDER: "Relance",
};

export const MAIL_STATUS_LABEL: Record<MailStatus, string> = {
  SENT: "Envoyé",
  FAILED: "Échec",
};
