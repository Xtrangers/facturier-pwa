import type { ReminderLevel } from "./enums";

export type Reminder = {
  id: string;
  companyId: string;
  target: "INVOICE" | "QUOTE";
  invoiceId: string | null;
  quoteId: string | null;
  documentNumber: string;
  clientName: string;
  level: ReminderLevel;
  notes: string;
  createdAt: string;
};

export type ReminderPayload = {
  invoiceId?: string;
  quoteId?: string;
  level: ReminderLevel;
  notes?: string;
};

export type ReminderQueueItem = {
  target: "INVOICE" | "QUOTE";
  id: string;
  documentNumber: string;
  clientName: string;
  clientId: string;
  amountCents: number;
  date: string;
  days: number;
  lastLevel: number | null;
};
