import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { computeQuoteTotals } from "@facturier/shared";
import type { DiscountKind, InvoiceStatus } from "@facturier/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceDto, CreatePaymentDto, InvoiceLineDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

type InvoiceRecord = Prisma.InvoiceGetPayload<{
  include: { client: true; lines: true; quote: true; payments: true; creditNotes: true };
}>;

@Injectable()
export class InvoicesService {
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

  private deriveStatus(invoice: {
    status: string;
    dueDate: Date;
    amountDueCents: number;
    amountPaidCents: number;
    creditedCents: number;
    totalTtcCents: number;
  }): InvoiceStatus {
    if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
      return invoice.status as InvoiceStatus;
    }
    if (invoice.amountDueCents <= 0) {
      return invoice.creditedCents >= invoice.totalTtcCents ? "CREDITED" : "PAID";
    }
    if (toIsoDate(invoice.dueDate) < todayIso()) return "OVERDUE";
    if (invoice.amountPaidCents > 0 || invoice.creditedCents > 0) return "PARTIAL";
    if (invoice.status === "SENT") return "SENT";
    return "ISSUED";
  }

  private map(invoice: InvoiceRecord) {
    const status = this.deriveStatus(invoice);
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      clientId: invoice.clientId,
      clientName: invoice.client.name,
      clientNumber: invoice.client.clientNumber,
      clientEmail: invoice.client.email,
      quoteId: invoice.quoteId,
      quoteNumber: invoice.quote?.quoteNumber ?? null,
      invoiceNumber: invoice.invoiceNumber,
      status,
      issueDate: toIsoDate(invoice.issueDate),
      dueDate: toIsoDate(invoice.dueDate),
      notes: invoice.notes,
      terms: invoice.terms,
      internalNotes: invoice.internalNotes,
      discountKind: invoice.discountKind,
      discountValue: invoice.discountValue,
      travelFeeCents: invoice.travelFeeCents,
      travelFeeTaxRateBps: invoice.travelFeeTaxRateBps,
      depositCents: invoice.depositCents,
      linesHtCents: invoice.linesHtCents,
      discountCents: invoice.discountCents,
      totalHtCents: invoice.totalHtCents,
      totalTaxCents: invoice.totalTaxCents,
      totalTtcCents: invoice.totalTtcCents,
      amountPaidCents: invoice.amountPaidCents,
      creditedCents: invoice.creditedCents,
      amountDueCents: invoice.amountDueCents,
      pdfUrl: invoice.pdfUrl,
      lines: invoice.lines
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((line) => ({
          id: line.id,
          productId: line.productId,
          position: line.position,
          designation: line.designation,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPriceCents: line.unitPriceCents,
          discountKind: line.discountKind,
          discountValue: line.discountValue,
          taxRateBps: line.taxRateBps,
          lineHtCents: line.lineHtCents,
          lineTaxCents: line.lineTaxCents,
          lineTtcCents: line.lineTtcCents,
        })),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  private include() {
    return { client: true, lines: true, quote: true, payments: true, creditNotes: true } as const;
  }

  private totalsFrom(dto: CreateInvoiceDto | UpdateInvoiceDto) {
    const lines = dto.lines ?? [];
    if (lines.length === 0) throw new BadRequestException("Ajoutez au moins une ligne à la facture.");
    return computeQuoteTotals({
      lines: lines.map((line) => ({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountKind: (line.discountKind ?? "NONE") as DiscountKind,
        discountValue: line.discountValue ?? 0,
        taxRateBps: line.taxRateBps,
      })),
      travelFeeCents: dto.travelFeeCents ?? 0,
      travelFeeTaxRateBps: dto.travelFeeTaxRateBps ?? 2000,
      discountKind: (dto.discountKind ?? "NONE") as DiscountKind,
      discountValue: dto.discountValue ?? 0,
    });
  }

  private lineRows(lines: InvoiceLineDto[], computed: ReturnType<typeof computeQuoteTotals>) {
    return lines.map((line, index) => ({
      productId: line.productId || null,
      position: index,
      designation: line.designation.trim(),
      description: line.description?.trim() ?? "",
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      discountKind: line.discountKind ?? "NONE",
      discountValue: line.discountValue ?? 0,
      taxRateBps: line.taxRateBps,
      lineHtCents: computed.lines[index].lineHtCents,
      lineTaxCents: computed.lines[index].lineTaxCents,
      lineTtcCents: computed.lines[index].lineTtcCents,
    }));
  }

  async refreshClientBalance(clientId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { clientId, deletedAt: null, status: { not: "DRAFT" } },
    });
    const balanceCents = invoices
      .filter((invoice) => invoice.status !== "CANCELLED")
      .reduce((sum, invoice) => sum + invoice.amountDueCents, 0);
    await this.prisma.client.update({ where: { id: clientId }, data: { balanceCents } });
  }

  private async persistDerived(id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: this.include(),
    });
    const status = this.deriveStatus(invoice);
    if (status !== invoice.status) {
      await this.prisma.invoice.update({ where: { id }, data: { status } });
    }
    await this.refreshClientBalance(invoice.clientId);
    return this.get(id);
  }

  async list(query: { q?: string; status?: string; clientId?: string; page?: string; pageSize?: string }) {
    const companyId = await this.companyId();
    await this.prisma.invoice.updateMany({
      where: {
        companyId,
        deletedAt: null,
        amountDueCents: { gt: 0 },
        status: { in: ["ISSUED", "SENT", "PARTIAL"] },
        dueDate: { lt: fromIsoDate(todayIso()) },
      },
      data: { status: "OVERDUE" },
    });
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: Prisma.InvoiceWhereInput = { companyId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { client: { name: { contains: q } } },
        { client: { clientNumber: { contains: q } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: this.include(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items: items.map((invoice) => this.map(invoice)), total, page, pageSize };
  }

  async get(id: string) {
    const companyId = await this.companyId();
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, deletedAt: null },
      include: this.include(),
    });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    return this.map(invoice);
  }

  async listPayments(id: string) {
    const companyId = await this.companyId();
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { client: true },
    });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { paidAt: "desc" },
    });
    return payments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.client.name,
      amountCents: payment.amountCents,
      method: payment.method,
      paidAt: toIsoDate(payment.paidAt),
      reference: payment.reference,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
    }));
  }

  private async nextNumber(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.companySettings.findUnique({ where: { companyId } });
      if (!settings) throw new NotFoundException("Paramètres entreprise manquants");
      const seq = settings.nextInvoiceSeq;
      const year = new Date().getUTCFullYear();
      const invoiceNumber = `${settings.invoicePrefix}-${year}-${String(seq).padStart(5, "0")}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextInvoiceSeq: seq + 1 },
      });
      return invoiceNumber;
    });
  }

  private async assertClient(companyId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId, deletedAt: null },
    });
    if (!client) throw new NotFoundException("Client introuvable");
    if (client.status === "BLOCKED") {
      throw new ConflictException("Ce client est bloqué : impossible de créer une facture.");
    }
    return client;
  }

  async create(dto: CreateInvoiceDto) {
    const companyId = await this.companyId();
    await this.assertClient(companyId, dto.clientId);
    const settings = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const issueDate = dto.issueDate ? fromIsoDate(dto.issueDate) : fromIsoDate(todayIso());
    const dueDate = dto.dueDate
      ? fromIsoDate(dto.dueDate)
      : fromIsoDate(addDays(toIsoDate(issueDate), settings?.defaultDueDays ?? 30));
    const computed = this.totalsFrom(dto);
    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        clientId: dto.clientId,
        quoteId: dto.quoteId || null,
        status: "DRAFT",
        issueDate,
        dueDate,
        notes: dto.notes?.trim() ?? "",
        terms: dto.terms?.trim() ?? "",
        internalNotes: dto.internalNotes?.trim() ?? "",
        discountKind: dto.discountKind ?? "NONE",
        discountValue: dto.discountValue ?? 0,
        travelFeeCents: dto.travelFeeCents ?? 0,
        travelFeeTaxRateBps: dto.travelFeeTaxRateBps ?? settings?.defaultTaxRateBps ?? 2000,
        depositCents: dto.depositCents ?? 0,
        linesHtCents: computed.linesHtCents,
        discountCents: computed.discountCents,
        totalHtCents: computed.totalHtCents,
        totalTaxCents: computed.totalTaxCents,
        totalTtcCents: computed.totalTtcCents,
        amountDueCents: computed.totalTtcCents,
        lines: { create: this.lineRows(dto.lines, computed) },
      },
      include: this.include(),
    });
    await this.audit(companyId, invoice.id, "create", {});
    return this.map(invoice);
  }

  async fromQuote(quoteId: string) {
    const companyId = await this.companyId();
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, companyId, deletedAt: null },
      include: { lines: true },
    });
    if (!quote) throw new NotFoundException("Devis introuvable");
    if (quote.status !== "ACCEPTED") {
      throw new ConflictException("Seul un devis accepté peut être transformé en facture.");
    }
    const existing = await this.prisma.invoice.findFirst({ where: { quoteId, deletedAt: null } });
    if (existing) throw new ConflictException("Ce devis a déjà une facture.");
    const invoice = await this.create({
      clientId: quote.clientId,
      quoteId: quote.id,
      notes: quote.notes,
      terms: quote.terms,
      internalNotes: quote.internalNotes,
      discountKind: quote.discountKind as CreateInvoiceDto["discountKind"],
      discountValue: quote.discountValue,
      travelFeeCents: quote.travelFeeCents,
      travelFeeTaxRateBps: quote.travelFeeTaxRateBps as CreateInvoiceDto["travelFeeTaxRateBps"],
      depositCents: quote.depositCents,
      lines: quote.lines
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((line) => ({
          productId: line.productId ?? undefined,
          designation: line.designation,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit as InvoiceLineDto["unit"],
          unitPriceCents: line.unitPriceCents,
          discountKind: line.discountKind as InvoiceLineDto["discountKind"],
          discountValue: line.discountValue,
          taxRateBps: line.taxRateBps as InvoiceLineDto["taxRateBps"],
        })),
    });
    await this.prisma.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED" } });
    await this.audit(companyId, invoice.id, "from-quote", { quoteId });
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictException("Une facture émise n’est plus modifiable. Créez un avoir.");
    }
    if (dto.clientId) await this.assertClient(existing.companyId, dto.clientId);
    const lines = dto.lines ?? existing.lines.map((line) => ({
      productId: line.productId ?? undefined,
      designation: line.designation,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit as InvoiceLineDto["unit"],
      unitPriceCents: line.unitPriceCents,
      discountKind: line.discountKind as InvoiceLineDto["discountKind"],
      discountValue: line.discountValue,
      taxRateBps: line.taxRateBps as InvoiceLineDto["taxRateBps"],
    }));
    const merged: CreateInvoiceDto = {
      clientId: dto.clientId ?? existing.clientId,
      quoteId: dto.quoteId ?? existing.quoteId ?? undefined,
      issueDate: dto.issueDate ?? existing.issueDate,
      dueDate: dto.dueDate ?? existing.dueDate,
      notes: dto.notes ?? existing.notes,
      terms: dto.terms ?? existing.terms,
      internalNotes: dto.internalNotes ?? existing.internalNotes,
      discountKind: dto.discountKind ?? (existing.discountKind as CreateInvoiceDto["discountKind"]),
      discountValue: dto.discountValue ?? existing.discountValue,
      travelFeeCents: dto.travelFeeCents ?? existing.travelFeeCents,
      travelFeeTaxRateBps: dto.travelFeeTaxRateBps ?? existing.travelFeeTaxRateBps,
      depositCents: dto.depositCents ?? existing.depositCents,
      lines,
    };
    const computed = this.totalsFrom(merged);
    await this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
    await this.prisma.invoice.update({
      where: { id },
      data: {
        clientId: merged.clientId,
        issueDate: fromIsoDate(merged.issueDate!),
        dueDate: fromIsoDate(merged.dueDate!),
        notes: merged.notes ?? "",
        terms: merged.terms ?? "",
        internalNotes: merged.internalNotes ?? "",
        discountKind: merged.discountKind ?? "NONE",
        discountValue: merged.discountValue ?? 0,
        travelFeeCents: merged.travelFeeCents ?? 0,
        travelFeeTaxRateBps: merged.travelFeeTaxRateBps ?? 2000,
        depositCents: merged.depositCents ?? 0,
        linesHtCents: computed.linesHtCents,
        discountCents: computed.discountCents,
        totalHtCents: computed.totalHtCents,
        totalTaxCents: computed.totalTaxCents,
        totalTtcCents: computed.totalTtcCents,
        amountDueCents: computed.totalTtcCents,
        lines: { create: this.lineRows(merged.lines, computed) },
      },
    });
    await this.audit(existing.companyId, id, "update", {});
    return this.get(id);
  }

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictException("Une facture émise ne peut pas être supprimée. Émettez un avoir.");
    }
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit(existing.companyId, id, "delete", {});
    return { ok: true };
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    return this.create({
      clientId: source.clientId,
      notes: source.notes,
      terms: source.terms,
      internalNotes: source.internalNotes,
      discountKind: source.discountKind as CreateInvoiceDto["discountKind"],
      discountValue: source.discountValue,
      travelFeeCents: source.travelFeeCents,
      travelFeeTaxRateBps: source.travelFeeTaxRateBps as CreateInvoiceDto["travelFeeTaxRateBps"],
      depositCents: 0,
      lines: source.lines.map((line) => ({
        productId: line.productId ?? undefined,
        designation: line.designation,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit as InvoiceLineDto["unit"],
        unitPriceCents: line.unitPriceCents,
        discountKind: line.discountKind as InvoiceLineDto["discountKind"],
        discountValue: line.discountValue,
        taxRateBps: line.taxRateBps as InvoiceLineDto["taxRateBps"],
      })),
    });
  }

  async issue(id: string) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") throw new ConflictException("Cette facture est déjà émise.");
    const invoiceNumber = await this.nextNumber(existing.companyId);
    await this.prisma.invoice.update({
      where: { id },
      data: { status: "ISSUED", invoiceNumber },
    });
    await this.audit(existing.companyId, id, "issue", { invoiceNumber });
    return this.persistDerived(id);
  }

  async changeStatus(id: string, status: "SENT" | "OVERDUE") {
    const existing = await this.get(id);
    if (existing.status === "DRAFT") throw new ConflictException("Émettez la facture avant de changer son statut.");
    await this.prisma.invoice.update({ where: { id }, data: { status } });
    await this.audit(existing.companyId, id, "status", { to: status });
    return this.persistDerived(id);
  }

  async addPayment(id: string, dto: CreatePaymentDto) {
    const existing = await this.get(id);
    if (existing.status === "DRAFT") throw new ConflictException("Émettez la facture avant d’enregistrer un paiement.");
    if (dto.amountCents > existing.amountDueCents) {
      throw new BadRequestException("Le paiement dépasse le restant dû.");
    }
    await this.prisma.payment.create({
      data: {
        companyId: existing.companyId,
        invoiceId: id,
        amountCents: dto.amountCents,
        method: dto.method,
        paidAt: dto.paidAt ? fromIsoDate(dto.paidAt) : fromIsoDate(todayIso()),
        reference: dto.reference?.trim() ?? "",
        notes: dto.notes?.trim() ?? "",
      },
    });
    const amountPaidCents = existing.amountPaidCents + dto.amountCents;
    const amountDueCents = Math.max(0, existing.totalTtcCents - amountPaidCents - existing.creditedCents);
    await this.prisma.invoice.update({
      where: { id },
      data: { amountPaidCents, amountDueCents },
    });
    await this.audit(existing.companyId, id, "payment", { amountCents: dto.amountCents });
    return this.persistDerived(id);
  }

  async applyCredit(invoiceId: string, ttcCents: number) {
    const existing = await this.get(invoiceId);
    const creditedCents = existing.creditedCents + ttcCents;
    const amountDueCents = Math.max(0, existing.totalTtcCents - existing.amountPaidCents - creditedCents);
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { creditedCents, amountDueCents },
    });
    return this.persistDerived(invoiceId);
  }

  private async audit(companyId: string, entityId: string, action: string, payload: unknown) {
    await this.prisma.auditLog.create({
      data: { companyId, entity: "invoice", entityId, action, payload: JSON.stringify(payload) },
    });
  }
}
