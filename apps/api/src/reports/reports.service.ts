import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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

function yearStartIso(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async companyId() {
    const company = await this.prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
    if (!company) {
      const fallback = await this.prisma.company.findFirst();
      if (!fallback) throw new NotFoundException("Aucune entreprise configurée");
      return fallback.id;
    }
    return company.id;
  }

  private period(from?: string, to?: string) {
    const start = from?.slice(0, 10) || yearStartIso();
    const end = to?.slice(0, 10) || todayIso();
    return { from: start, to: end, startDate: fromIsoDate(start), endDate: fromIsoDate(end) };
  }

  async get(from?: string, to?: string) {
    const companyId = await this.companyId();
    const period = this.period(from, to);
    const issuedWhere = {
      companyId,
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      issueDate: { gte: period.startDate, lte: period.endDate },
    };

    const [invoices, payments, creditNotes, unpaid] = await Promise.all([
      this.prisma.invoice.findMany({
        where: issuedWhere,
        include: { client: true, lines: true },
      }),
      this.prisma.payment.findMany({
        where: { companyId, paidAt: { gte: period.startDate, lte: period.endDate } },
      }),
      this.prisma.creditNote.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: "ISSUED",
          issueDate: { gte: period.startDate, lte: period.endDate },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ["DRAFT", "CANCELLED"] },
          amountDueCents: { gt: 0 },
          issueDate: { lte: period.endDate },
        },
        include: { client: true },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const overdue = unpaid.filter((invoice) => toIsoDate(invoice.dueDate) <= period.to);
    const vatMap = new Map<number, { htCents: number; taxCents: number }>();
    for (const invoice of invoices) {
      for (const line of invoice.lines) {
        const current = vatMap.get(line.taxRateBps) ?? { htCents: 0, taxCents: 0 };
        current.htCents += line.lineHtCents;
        current.taxCents += line.lineTaxCents;
        vatMap.set(line.taxRateBps, current);
      }
      if (invoice.travelFeeCents > 0) {
        const current = vatMap.get(invoice.travelFeeTaxRateBps) ?? { htCents: 0, taxCents: 0 };
        current.htCents += invoice.travelFeeCents;
        current.taxCents += Math.round((invoice.travelFeeCents * invoice.travelFeeTaxRateBps) / 10_000);
        vatMap.set(invoice.travelFeeTaxRateBps, current);
      }
    }

    const monthKeys = new Set<string>();
    for (const invoice of invoices) monthKeys.add(toIsoDate(invoice.issueDate).slice(0, 7));
    for (const payment of payments) monthKeys.add(toIsoDate(payment.paidAt).slice(0, 7));
    const months = [...monthKeys].sort().map((month) => {
      const [y, m] = month.split("-").map(Number);
      const ofMonth = invoices.filter((invoice) => toIsoDate(invoice.issueDate).startsWith(month));
      return {
        month,
        label: `${MONTH_LABELS[(m ?? 1) - 1]} ${y}`,
        htCents: ofMonth.reduce((sum, invoice) => sum + invoice.totalHtCents, 0),
        taxCents: ofMonth.reduce((sum, invoice) => sum + invoice.totalTaxCents, 0),
        ttcCents: ofMonth.reduce((sum, invoice) => sum + invoice.totalTtcCents, 0),
        paidCents: payments
          .filter((payment) => toIsoDate(payment.paidAt).startsWith(month))
          .reduce((sum, payment) => sum + payment.amountCents, 0),
      };
    });

    return {
      from: period.from,
      to: period.to,
      invoiceCount: invoices.length,
      creditNoteCount: creditNotes.length,
      paymentCount: payments.length,
      htCents: invoices.reduce((sum, invoice) => sum + invoice.totalHtCents, 0),
      taxCents: invoices.reduce((sum, invoice) => sum + invoice.totalTaxCents, 0),
      ttcCents: invoices.reduce((sum, invoice) => sum + invoice.totalTtcCents, 0),
      paidCents: payments.reduce((sum, payment) => sum + payment.amountCents, 0),
      creditedCents: creditNotes.reduce((sum, note) => sum + note.totalTtcCents, 0),
      dueCents: unpaid.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
      overdueCount: overdue.length,
      overdueCents: overdue.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
      months,
      vat: [...vatMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([taxRateBps, row]) => ({
          taxRateBps,
          htCents: row.htCents,
          taxCents: row.taxCents,
          ttcCents: row.htCents + row.taxCents,
        })),
      unpaid: unpaid.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        issueDate: toIsoDate(invoice.issueDate),
        dueDate: toIsoDate(invoice.dueDate),
        totalTtcCents: invoice.totalTtcCents,
        amountDueCents: invoice.amountDueCents,
        status: invoice.status,
      })),
    };
  }

  async exportCsv(from?: string, to?: string) {
    const report = await this.get(from, to);
    const eur = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
    const summary = [
      ["Période", `${report.from} → ${report.to}`],
      ["Factures émises", report.invoiceCount],
      ["CA HT EUR", eur(report.htCents)],
      ["TVA EUR", eur(report.taxCents)],
      ["CA TTC EUR", eur(report.ttcCents)],
      ["Encaissé EUR", eur(report.paidCents)],
      ["Avoirs EUR", eur(report.creditedCents)],
      ["Restant dû EUR", eur(report.dueCents)],
      ["Échus EUR", eur(report.overdueCents)],
    ]
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");

    const unpaidHeader = ["Numéro", "Client", "Émise", "Échéance", "TTC EUR", "Restant EUR", "Statut"].map(csvCell).join(";");
    const unpaidRows = report.unpaid
      .map((row) =>
        [row.invoiceNumber ?? "Brouillon", row.clientName, row.issueDate, row.dueDate, eur(row.totalTtcCents), eur(row.amountDueCents), row.status]
          .map(csvCell)
          .join(";"),
      )
      .join("\n");

    const vatHeader = ["Taux", "HT EUR", "TVA EUR", "TTC EUR"].map(csvCell).join(";");
    const vatRows = report.vat
      .map((row) => [`${(row.taxRateBps / 100).toFixed(1).replace(".", ",")} %`, eur(row.htCents), eur(row.taxCents), eur(row.ttcCents)].map(csvCell).join(";"))
      .join("\n");

    return `\uFEFF${summary}\n\n${vatHeader}\n${vatRows}\n\n${unpaidHeader}\n${unpaidRows}\n`;
  }
}
