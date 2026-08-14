import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ttcFromHt } from "@facturier/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

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
export class CreditNotesService {
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

  private map(note: Prisma.CreditNoteGetPayload<{ include: { client: true; invoice: true } }>) {
    return {
      id: note.id,
      companyId: note.companyId,
      clientId: note.clientId,
      clientName: note.client.name,
      clientEmail: note.client.email,
      invoiceId: note.invoiceId,
      invoiceNumber: note.invoice.invoiceNumber,
      creditNumber: note.creditNumber,
      status: note.status,
      kind: note.kind,
      issueDate: toIsoDate(note.issueDate),
      reason: note.reason,
      notes: note.notes,
      taxRateBps: note.taxRateBps,
      totalHtCents: note.totalHtCents,
      totalTaxCents: note.totalTaxCents,
      totalTtcCents: note.totalTtcCents,
      pdfUrl: note.pdfUrl,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private include() {
    return { client: true, invoice: true } as const;
  }

  async list(query: { q?: string; status?: string; invoiceId?: string; page?: string; pageSize?: string }) {
    const companyId = await this.companyId();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: Prisma.CreditNoteWhereInput = { companyId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ creditNumber: { contains: q } }, { reason: { contains: q } }, { client: { name: { contains: q } } }];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditNote.findMany({
        where,
        include: this.include(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creditNote.count({ where }),
    ]);
    return { items: items.map((note) => this.map(note)), total, page, pageSize };
  }

  async get(id: string) {
    const companyId = await this.companyId();
    const note = await this.prisma.creditNote.findFirst({
      where: { id, companyId, deletedAt: null },
      include: this.include(),
    });
    if (!note) throw new NotFoundException("Avoir introuvable");
    return this.map(note);
  }

  private amounts(dto: CreateCreditNoteDto, invoice: { amountDueCents: number; totalHtCents: number; totalTtcCents: number; totalTaxCents: number }) {
    if (invoice.amountDueCents <= 0) {
      throw new BadRequestException("Cette facture n’a plus de restant à avoiriser.");
    }
    if (dto.kind === "TOTAL") {
      const ratio = invoice.totalTtcCents === 0 ? 1 : invoice.amountDueCents / invoice.totalTtcCents;
      const totalHtCents = Math.round(invoice.totalHtCents * ratio);
      const totalTtcCents = invoice.amountDueCents;
      const totalTaxCents = Math.max(0, totalTtcCents - totalHtCents);
      return { totalHtCents, totalTaxCents, totalTtcCents, taxRateBps: dto.taxRateBps ?? 2000 };
    }
    if (!dto.totalHtCents) throw new BadRequestException("Indiquez le montant HT de l’avoir partiel.");
    const taxRateBps = dto.taxRateBps ?? 2000;
    const totalHtCents = dto.totalHtCents;
    const totalTtcCents = ttcFromHt(totalHtCents, taxRateBps);
    const totalTaxCents = totalTtcCents - totalHtCents;
    if (totalTtcCents > invoice.amountDueCents) {
      throw new BadRequestException("L’avoir dépasse le restant dû de la facture.");
    }
    return { totalHtCents, totalTaxCents, totalTtcCents, taxRateBps };
  }

  async create(dto: CreateCreditNoteDto) {
    const companyId = await this.companyId();
    const invoice = await this.invoices.get(dto.invoiceId);
    if (invoice.status === "DRAFT") throw new ConflictException("Émettez la facture avant de créer un avoir.");
    const amounts = this.amounts(dto, invoice);
    const note = await this.prisma.creditNote.create({
      data: {
        companyId,
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        status: "DRAFT",
        kind: dto.kind,
        issueDate: dto.issueDate ? fromIsoDate(dto.issueDate) : fromIsoDate(todayIso()),
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() ?? "",
        ...amounts,
      },
      include: this.include(),
    });
    return this.map(note);
  }

  async issue(id: string) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") throw new ConflictException("Cet avoir est déjà émis.");
    const invoice = await this.invoices.get(existing.invoiceId);
    if (existing.totalTtcCents > invoice.amountDueCents) {
      throw new BadRequestException("L’avoir dépasse le restant dû de la facture.");
    }
    const companyId = existing.companyId;
    const creditNumber = await this.prisma.$transaction(async (tx) => {
      const settings = await tx.companySettings.findUnique({ where: { companyId } });
      if (!settings) throw new NotFoundException("Paramètres entreprise manquants");
      const seq = settings.nextCreditSeq;
      const year = new Date().getUTCFullYear();
      const number = `${settings.creditPrefix}-${year}-${String(seq).padStart(5, "0")}`;
      await tx.companySettings.update({ where: { companyId }, data: { nextCreditSeq: seq + 1 } });
      return number;
    });
    await this.prisma.creditNote.update({
      where: { id },
      data: { status: "ISSUED", creditNumber },
    });
    await this.invoices.applyCredit(existing.invoiceId, existing.totalTtcCents);
    await this.prisma.auditLog.create({
      data: {
        companyId,
        entity: "creditNote",
        entityId: id,
        action: "issue",
        payload: JSON.stringify({ creditNumber }),
      },
    });
    return this.get(id);
  }

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictException("Un avoir émis ne peut pas être supprimé.");
    }
    await this.prisma.creditNote.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
