import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { RecordPaymentDto } from "./dto/record-payment.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InvoicesService) private readonly invoices: InvoicesService,
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

  private map(
    payment: Prisma.PaymentGetPayload<{ include: { invoice: { include: { client: true } } } }>,
  ) {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      clientId: payment.invoice.clientId,
      clientName: payment.invoice.client.name,
      amountCents: payment.amountCents,
      method: payment.method,
      paidAt: toIsoDate(payment.paidAt),
      reference: payment.reference,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  async list(query: { q?: string; method?: string; clientId?: string; from?: string; to?: string }) {
    const companyId = await this.companyId();
    const where: Prisma.PaymentWhereInput = { companyId };
    if (query.method) where.method = query.method;
    if (query.clientId) where.invoice = { clientId: query.clientId };
    if (query.from || query.to) {
      where.paidAt = {};
      if (query.from) where.paidAt.gte = fromIsoDate(query.from);
      if (query.to) where.paidAt.lte = fromIsoDate(query.to);
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { reference: { contains: q } },
        { invoice: { invoiceNumber: { contains: q } } },
        { invoice: { client: { name: { contains: q } } } },
      ];
    }
    const items = await this.prisma.payment.findMany({
      where,
      include: { invoice: { include: { client: true } } },
      orderBy: { paidAt: "desc" },
      take: 200,
    });
    const mapped = items.map((payment) => this.map(payment));
    return {
      items: mapped,
      total: mapped.length,
      totalCents: mapped.reduce((sum, payment) => sum + payment.amountCents, 0),
    };
  }

  async openInvoices() {
    const companyId = await this.companyId();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: "DRAFT" },
        amountDueCents: { gt: 0 },
      },
      include: { client: true },
      orderBy: [{ dueDate: "asc" }, { invoiceNumber: "asc" }],
    });
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client.name,
      amountDueCents: invoice.amountDueCents,
      dueDate: toIsoDate(invoice.dueDate),
    }));
  }

  async create(dto: RecordPaymentDto) {
    return this.invoices.addPayment(dto.invoiceId, {
      amountCents: dto.amountCents,
      method: dto.method,
      paidAt: dto.paidAt,
      reference: dto.reference,
      notes: dto.notes,
    });
  }

  async exportCsv(query: { q?: string; method?: string; clientId?: string; from?: string; to?: string }) {
    const { items } = await this.list(query);
    const header = ["Date", "Facture", "Client", "Moyen", "Référence", "Montant EUR"];
    const labels: Record<string, string> = {
      TRANSFER: "Virement",
      CARD: "Carte bancaire",
      CHECK: "Chèque",
      CASH: "Espèces",
      DIRECT_DEBIT: "Prélèvement",
    };
    const lines = items.map((payment) =>
      [
        payment.paidAt,
        payment.invoiceNumber ?? "",
        payment.clientName,
        labels[payment.method] ?? payment.method,
        payment.reference,
        (payment.amountCents / 100).toFixed(2).replace(".", ","),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(";"),
    );
    return `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
  }
}
