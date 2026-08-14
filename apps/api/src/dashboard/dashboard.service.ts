import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RemindersService } from "../reminders/reminders.service";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

const MONTH_LABELS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function todayIso(): string {
  return toIsoDate(new Date());
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RemindersService) private readonly reminders: RemindersService,
  ) {}

  private async companyId() {
    const company = await this.prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
    if (!company) {
      const fallback = await this.prisma.company.findFirst();
      if (!fallback) throw new NotFoundException("Aucune entreprise configurée");
      return fallback.id;
    }
    return company.id;
  }

  async get() {
    const companyId = await this.companyId();
    const year = new Date().getUTCFullYear();
    const yearStart = fromIsoDate(`${year}-01-01`);
    const yearEnd = fromIsoDate(`${year}-12-31`);
    const today = fromIsoDate(todayIso());

    const issuedWhere: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
    };

    const [yearInvoices, openInvoices, overdueInvoices, quotesOpen, paymentsYear, clientCount] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { ...issuedWhere, issueDate: { gte: yearStart, lte: yearEnd } },
      }),
      this.prisma.invoice.findMany({
        where: { ...issuedWhere, amountDueCents: { gt: 0 } },
      }),
      this.prisma.invoice.findMany({
        where: { ...issuedWhere, amountDueCents: { gt: 0 }, dueDate: { lte: today } },
      }),
      this.prisma.quote.findMany({
        where: { companyId, deletedAt: null, status: { in: ["SENT", "PENDING", "ACCEPTED"] } },
      }),
      this.prisma.payment.findMany({
        where: { companyId, paidAt: { gte: yearStart, lte: yearEnd } },
      }),
      this.prisma.client.count({ where: { companyId, deletedAt: null } }),
    ]);
    const [recent, debtors, reminderQueue] = await Promise.all([
      this.prisma.invoice.findMany({
        where: issuedWhere,
        include: { client: true },
        orderBy: { issueDate: "desc" },
        take: 8,
      }),
      this.prisma.client.findMany({
        where: { companyId, deletedAt: null, balanceCents: { gt: 0 } },
        orderBy: { balanceCents: "desc" },
        take: 5,
      }),
      this.reminders.queue(),
    ]);

    const months = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, "0")}`;
      const ttcCents = yearInvoices
        .filter((invoice) => toIsoDate(invoice.issueDate).startsWith(month))
        .reduce((sum, invoice) => sum + invoice.totalTtcCents, 0);
      return { month, label: MONTH_LABELS[index], ttcCents };
    });

    return {
      kpis: {
        year,
        revenueHtCents: yearInvoices.reduce((sum, invoice) => sum + invoice.totalHtCents, 0),
        revenueTaxCents: yearInvoices.reduce((sum, invoice) => sum + invoice.totalTaxCents, 0),
        revenueTtcCents: yearInvoices.reduce((sum, invoice) => sum + invoice.totalTtcCents, 0),
        paidCents: paymentsYear.reduce((sum, payment) => sum + payment.amountCents, 0),
        dueCents: openInvoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
        overdueCount: overdueInvoices.length,
        overdueCents: overdueInvoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
        quotesOpenCount: quotesOpen.length,
        quotesOpenCents: quotesOpen.reduce((sum, quote) => sum + quote.totalTtcCents, 0),
        reminderCount: reminderQueue.length,
        clientCount,
      },
      months,
      recentInvoices: recent.map((invoice) => ({
        id: invoice.id,
        kind: "INVOICE" as const,
        number: invoice.invoiceNumber ?? "Brouillon",
        clientName: invoice.client.name,
        status: invoice.status,
        amountCents: invoice.totalTtcCents,
        date: toIsoDate(invoice.issueDate),
      })),
      reminderQueue: reminderQueue.slice(0, 6),
      topDebtors: debtors.map((client) => ({
        clientId: client.id,
        clientName: client.name,
        balanceCents: client.balanceCents,
      })),
    };
  }
}
