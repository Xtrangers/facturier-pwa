export const ClientType = {
  INDIVIDUAL: "INDIVIDUAL",
  COMPANY: "COMPANY",
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];

export const ClientStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  INDIVIDUAL: "Particulier",
  COMPANY: "Entreprise",
};

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  BLOCKED: "Bloqué",
};

export const UserRole = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  ACCOUNTANT: "ACCOUNTANT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductType = {
  MATERIAL: "MATERIAL",
  LABOR: "LABOR",
  SERVICE: "SERVICE",
  TRAVEL: "TRAVEL",
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  MATERIAL: "Matériel",
  LABOR: "Main-d’œuvre",
  SERVICE: "Service",
  TRAVEL: "Frais de déplacement",
};

export const ProductUnit = {
  PIECE: "PIECE",
  HOUR: "HOUR",
  DAY: "DAY",
  METER: "METER",
  FLAT: "FLAT",
} as const;
export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

export const PRODUCT_UNIT_LABEL: Record<ProductUnit, string> = {
  PIECE: "Pièce",
  HOUR: "Heure",
  DAY: "Jour",
  METER: "Mètre",
  FLAT: "Forfait",
};

export const ProductStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Actif",
  ARCHIVED: "Archivé",
};

export const TAX_RATE_OPTIONS = [
  { bps: 0, label: "0 %" },
  { bps: 550, label: "5,5 %" },
  { bps: 1000, label: "10 %" },
  { bps: 2000, label: "20 %" },
] as const;

export const QuoteStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CONVERTED: "CONVERTED",
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
  CONVERTED: "Transformé en facture",
};

export const DiscountKind = {
  NONE: "NONE",
  PERCENT: "PERCENT",
  AMOUNT: "AMOUNT",
} as const;
export type DiscountKind = (typeof DiscountKind)[keyof typeof DiscountKind];

export const DISCOUNT_KIND_LABEL: Record<DiscountKind, string> = {
  NONE: "Aucune",
  PERCENT: "Pourcentage",
  AMOUNT: "Montant",
};

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  SENT: "SENT",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
  CREDITED: "CREDITED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  SENT: "Envoyée",
  PARTIAL: "Partiellement payée",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
  CREDITED: "Avoir associé",
};

export const PaymentMethod = {
  TRANSFER: "TRANSFER",
  CARD: "CARD",
  CHECK: "CHECK",
  CASH: "CASH",
  DIRECT_DEBIT: "DIRECT_DEBIT",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  TRANSFER: "Virement",
  CARD: "Carte bancaire",
  CHECK: "Chèque",
  CASH: "Espèces",
  DIRECT_DEBIT: "Prélèvement",
};

export const CreditNoteStatus = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
} as const;
export type CreditNoteStatus = (typeof CreditNoteStatus)[keyof typeof CreditNoteStatus];

export const CREDIT_NOTE_STATUS_LABEL: Record<CreditNoteStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émis",
};

export const CreditNoteKind = {
  TOTAL: "TOTAL",
  PARTIAL: "PARTIAL",
} as const;
export type CreditNoteKind = (typeof CreditNoteKind)[keyof typeof CreditNoteKind];

export const CREDIT_NOTE_KIND_LABEL: Record<CreditNoteKind, string> = {
  TOTAL: "Total",
  PARTIAL: "Partiel",
};

export const ReminderLevel = {
  FIRST: 1,
  SECOND: 2,
  FORMAL: 3,
} as const;
export type ReminderLevel = (typeof ReminderLevel)[keyof typeof ReminderLevel];

export const REMINDER_LEVEL_LABEL: Record<ReminderLevel, string> = {
  1: "1re relance",
  2: "2e relance",
  3: "Mise en demeure",
};
