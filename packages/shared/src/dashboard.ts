import type { ReminderQueueItem } from "./reminder";

export type DashboardKpis = {
  year: number;
  revenueHtCents: number;
  revenueTaxCents: number;
  revenueTtcCents: number;
  paidCents: number;
  dueCents: number;
  overdueCount: number;
  overdueCents: number;
  quotesOpenCount: number;
  quotesOpenCents: number;
  reminderCount: number;
  clientCount: number;
};

export type DashboardMonth = {
  month: string;
  label: string;
  ttcCents: number;
};

export type DashboardDocument = {
  id: string;
  kind: "INVOICE" | "QUOTE";
  number: string;
  clientName: string;
  status: string;
  amountCents: number;
  date: string;
};

export type DashboardDebtor = {
  clientId: string;
  clientName: string;
  balanceCents: number;
};

export type Dashboard = {
  kpis: DashboardKpis;
  months: DashboardMonth[];
  recentInvoices: DashboardDocument[];
  reminderQueue: ReminderQueueItem[];
  topDebtors: DashboardDebtor[];
};
