export type CompanyProfile = {
  id: string;
  name: string;
  logoUrl: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  siret: string;
  vatNumber: string;
  paymentTerms: string;
  iban: string;
  bic: string;
  clientPrefix: string;
  quotePrefix: string;
  invoicePrefix: string;
  creditPrefix: string;
  nextClientSeq: number;
  nextQuoteSeq: number;
  nextInvoiceSeq: number;
  nextCreditSeq: number;
  defaultTaxRateBps: number;
  defaultDueDays: number;
  pdfPrimaryColor: string;
  legalMentions: string;
  termsAndConditions: string;
  nextClientNumber: string;
  nextQuoteNumber: string;
  nextInvoiceNumber: string;
  nextCreditNumber: string;
};

export type CompanyProfilePayload = {
  name: string;
  logoUrl?: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
  vatNumber?: string;
  paymentTerms?: string;
  iban?: string;
  bic?: string;
  clientPrefix?: string;
  quotePrefix?: string;
  invoicePrefix?: string;
  creditPrefix?: string;
  defaultTaxRateBps?: number;
  defaultDueDays?: number;
  pdfPrimaryColor?: string;
  legalMentions?: string;
  termsAndConditions?: string;
};

export const DEFAULT_TAX_RATE_OPTIONS = [
  { value: 2000, label: "20 %" },
  { value: 1000, label: "10 %" },
  { value: 550, label: "5,5 %" },
  { value: 0, label: "0 %" },
] as const;
