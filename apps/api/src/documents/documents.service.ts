import {
  CREDIT_NOTE_STATUS_LABEL,
  INVOICE_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
} from "@facturier/shared";
import type { CreditNoteStatus, InvoiceStatus, QuoteStatus } from "@facturier/shared";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class DocumentsService {
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

  async list(query: { q?: string; kind?: string; from?: string; to?: string }) {
    const companyId = await this.companyId();
    const q = query.q?.trim();
    const [quotes, invoices, credits] = await Promise.all([
      this.prisma.quote.findMany({
        where: { companyId, deletedAt: null },
        include: { client: true },
        orderBy: { issueDate: "desc" },
      }),
      this.prisma.invoice.findMany({
        where: { companyId, deletedAt: null },
        include: { client: true },
        orderBy: { issueDate: "desc" },
      }),
      this.prisma.creditNote.findMany({
        where: { companyId, deletedAt: null },
        include: { client: true },
        orderBy: { issueDate: "desc" },
      }),
    ]);

    let items = [
      ...quotes.map((quote) => ({
        id: quote.id,
        kind: "QUOTE" as const,
        number: quote.quoteNumber,
        clientId: quote.clientId,
        clientName: quote.client.name,
        status: quote.status,
        issueDate: toIsoDate(quote.issueDate),
        totalTtcCents: quote.totalTtcCents,
        href: `/devis/${quote.id}`,
      })),
      ...invoices.map((invoice) => ({
        id: invoice.id,
        kind: "INVOICE" as const,
        number: invoice.invoiceNumber ?? "Brouillon",
        clientId: invoice.clientId,
        clientName: invoice.client.name,
        status: invoice.status,
        issueDate: toIsoDate(invoice.issueDate),
        totalTtcCents: invoice.totalTtcCents,
        href: `/factures/${invoice.id}`,
      })),
      ...credits.map((note) => ({
        id: note.id,
        kind: "CREDIT_NOTE" as const,
        number: note.creditNumber ?? "Brouillon",
        clientId: note.clientId,
        clientName: note.client.name,
        status: note.status,
        issueDate: toIsoDate(note.issueDate),
        totalTtcCents: note.totalTtcCents,
        href: `/avoirs/${note.id}`,
      })),
    ].sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number));

    if (query.from || query.to) {
      items = items.filter((item) => {
        if (query.from && item.issueDate < query.from) return false;
        if (query.to && item.issueDate > query.to) return false;
        return true;
      });
    }
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (item) =>
          item.number.toLowerCase().includes(needle) || item.clientName.toLowerCase().includes(needle),
      );
    }

    const quoteCount = items.filter((item) => item.kind === "QUOTE").length;
    const invoiceCount = items.filter((item) => item.kind === "INVOICE").length;
    const creditCount = items.filter((item) => item.kind === "CREDIT_NOTE").length;

    if (query.kind === "QUOTE" || query.kind === "INVOICE" || query.kind === "CREDIT_NOTE") {
      items = items.filter((item) => item.kind === query.kind);
    }

    return {
      items,
      total: items.length,
      totalTtcCents: items.reduce((sum, item) => sum + item.totalTtcCents, 0),
      quoteCount,
      invoiceCount,
      creditCount,
    };
  }

  async exportCsv(query: { q?: string; kind?: string; from?: string; to?: string }) {
    const { items } = await this.list(query);
    const kindLabel = { QUOTE: "Devis", INVOICE: "Facture", CREDIT_NOTE: "Avoir" } as const;
    const header = ["Type", "Numéro", "Client", "Date", "Statut", "TTC EUR"];
    const lines = items.map((item) => {
      const status =
        item.kind === "QUOTE"
          ? (QUOTE_STATUS_LABEL[item.status as QuoteStatus] ?? item.status)
          : item.kind === "INVOICE"
            ? (INVOICE_STATUS_LABEL[item.status as InvoiceStatus] ?? item.status)
            : (CREDIT_NOTE_STATUS_LABEL[item.status as CreditNoteStatus] ?? item.status);
      return [
        kindLabel[item.kind],
        item.number,
        item.clientName,
        item.issueDate,
        status,
        (item.totalTtcCents / 100).toFixed(2).replace(".", ","),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(";");
    });
    return `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
  }
}
