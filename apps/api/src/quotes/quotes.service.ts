import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { computeQuoteTotals } from "@facturier/shared";
import type { DiscountKind } from "@facturier/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuoteDto, QuoteLineDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/update-quote.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
  PENDING: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

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

@Injectable()
export class QuotesService {
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

  private map(
    quote: Prisma.QuoteGetPayload<{ include: { client: true; lines: true; invoices: true } }>,
  ) {
    return {
      id: quote.id,
      companyId: quote.companyId,
      clientId: quote.clientId,
      clientName: quote.client.name,
      clientNumber: quote.client.clientNumber,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      issueDate: toIsoDate(quote.issueDate),
      validUntil: toIsoDate(quote.validUntil),
      notes: quote.notes,
      terms: quote.terms,
      internalNotes: quote.internalNotes,
      discountKind: quote.discountKind,
      discountValue: quote.discountValue,
      travelFeeCents: quote.travelFeeCents,
      travelFeeTaxRateBps: quote.travelFeeTaxRateBps,
      depositCents: quote.depositCents,
      linesHtCents: quote.linesHtCents,
      discountCents: quote.discountCents,
      totalHtCents: quote.totalHtCents,
      totalTaxCents: quote.totalTaxCents,
      totalTtcCents: quote.totalTtcCents,
      invoiceId: quote.invoices.find((invoice) => !invoice.deletedAt)?.id ?? null,
      lines: quote.lines
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
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    };
  }

  private totalsFrom(dto: CreateQuoteDto | UpdateQuoteDto) {
    const lines = dto.lines ?? [];
    if (lines.length === 0) {
      throw new BadRequestException("Ajoutez au moins une ligne au devis.");
    }
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

  private lineRows(lines: QuoteLineDto[], computed: ReturnType<typeof computeQuoteTotals>) {
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

  async list(query: { q?: string; status?: string; clientId?: string; page?: string; pageSize?: string }) {
    const companyId = await this.companyId();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: Prisma.QuoteWhereInput = { companyId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { quoteNumber: { contains: q } },
        { client: { name: { contains: q } } },
        { client: { clientNumber: { contains: q } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: { client: true, lines: true, invoices: true },
        orderBy: { quoteNumber: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { items: items.map((quote) => this.map(quote)), total, page, pageSize };
  }

  async get(id: string) {
    const companyId = await this.companyId();
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { client: true, lines: true, invoices: true },
    });
    if (!quote) throw new NotFoundException("Devis introuvable");
    return this.map(quote);
  }

  private async nextNumber(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.companySettings.findUnique({ where: { companyId } });
      if (!settings) throw new NotFoundException("Paramètres entreprise manquants");
      const seq = settings.nextQuoteSeq;
      const year = new Date().getUTCFullYear();
      const quoteNumber = `${settings.quotePrefix}-${year}-${String(seq).padStart(5, "0")}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextQuoteSeq: seq + 1 },
      });
      return quoteNumber;
    });
  }

  private async assertClient(companyId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId, deletedAt: null },
    });
    if (!client) throw new NotFoundException("Client introuvable");
    if (client.status === "BLOCKED") {
      throw new ConflictException("Ce client est bloqué : impossible de créer un devis.");
    }
    return client;
  }

  async create(dto: CreateQuoteDto) {
    const companyId = await this.companyId();
    await this.assertClient(companyId, dto.clientId);
    const settings = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const issueDate = dto.issueDate ? fromIsoDate(dto.issueDate) : fromIsoDate(todayIso());
    const validUntil = dto.validUntil
      ? fromIsoDate(dto.validUntil)
      : fromIsoDate(addDays(toIsoDate(issueDate), settings?.defaultDueDays ?? 30));
    const computed = this.totalsFrom(dto);
    const quoteNumber = await this.nextNumber(companyId);
    const quote = await this.prisma.quote.create({
      data: {
        companyId,
        clientId: dto.clientId,
        quoteNumber,
        status: "DRAFT",
        issueDate,
        validUntil,
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
        lines: { create: this.lineRows(dto.lines, computed) },
      },
      include: { client: true, lines: true, invoices: true },
    });
    await this.audit(companyId, quote.id, "create", { quoteNumber });
    return this.map(quote);
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictException("Seul un brouillon peut être modifié.");
    }
    if (dto.clientId) await this.assertClient(existing.companyId, dto.clientId);
    const lines = dto.lines ?? existing.lines.map((line) => ({
      productId: line.productId ?? undefined,
      designation: line.designation,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit as QuoteLineDto["unit"],
      unitPriceCents: line.unitPriceCents,
      discountKind: line.discountKind as QuoteLineDto["discountKind"],
      discountValue: line.discountValue,
      taxRateBps: line.taxRateBps as QuoteLineDto["taxRateBps"],
    }));
    const merged: CreateQuoteDto = {
      clientId: dto.clientId ?? existing.clientId,
      issueDate: dto.issueDate ?? existing.issueDate,
      validUntil: dto.validUntil ?? existing.validUntil,
      notes: dto.notes ?? existing.notes,
      terms: dto.terms ?? existing.terms,
      internalNotes: dto.internalNotes ?? existing.internalNotes,
      discountKind: dto.discountKind ?? (existing.discountKind as CreateQuoteDto["discountKind"]),
      discountValue: dto.discountValue ?? existing.discountValue,
      travelFeeCents: dto.travelFeeCents ?? existing.travelFeeCents,
      travelFeeTaxRateBps: dto.travelFeeTaxRateBps ?? existing.travelFeeTaxRateBps,
      depositCents: dto.depositCents ?? existing.depositCents,
      lines,
    };
    const computed = this.totalsFrom(merged);
    await this.prisma.quoteLine.deleteMany({ where: { quoteId: id } });
    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        clientId: merged.clientId,
        issueDate: fromIsoDate(merged.issueDate!),
        validUntil: fromIsoDate(merged.validUntil!),
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
        lines: { create: this.lineRows(merged.lines, computed) },
      },
      include: { client: true, lines: true, invoices: true },
    });
    await this.audit(existing.companyId, id, "update", {});
    return this.map(quote);
  }

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictException("Seul un brouillon peut être supprimé.");
    }
    await this.prisma.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(existing.companyId, id, "delete", { quoteNumber: existing.quoteNumber });
    return { ok: true };
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    const copy = await this.create({
      clientId: source.clientId,
      notes: source.notes,
      terms: source.terms,
      internalNotes: source.internalNotes,
      discountKind: source.discountKind as CreateQuoteDto["discountKind"],
      discountValue: source.discountValue,
      travelFeeCents: source.travelFeeCents,
      travelFeeTaxRateBps: source.travelFeeTaxRateBps as CreateQuoteDto["travelFeeTaxRateBps"],
      depositCents: source.depositCents,
      lines: source.lines.map((line) => ({
        productId: line.productId ?? undefined,
        designation: line.designation,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit as QuoteLineDto["unit"],
        unitPriceCents: line.unitPriceCents,
        discountKind: line.discountKind as QuoteLineDto["discountKind"],
        discountValue: line.discountValue,
        taxRateBps: line.taxRateBps as QuoteLineDto["taxRateBps"],
      })),
    });
    await this.audit(source.companyId, copy.id, "duplicate", { from: source.id });
    return copy;
  }

  async changeStatus(id: string, status: string) {
    const existing = await this.get(id);
    const allowed = TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ConflictException("Ce changement de statut n’est pas autorisé.");
    }
    await this.prisma.quote.update({
      where: { id },
      data: { status },
    });
    await this.audit(existing.companyId, id, "status", { from: existing.status, to: status });
    return this.get(id);
  }

  private async audit(companyId: string, entityId: string, action: string, payload: unknown) {
    await this.prisma.auditLog.create({
      data: {
        companyId,
        entity: "quote",
        entityId,
        action,
        payload: JSON.stringify(payload),
      },
    });
  }
}
