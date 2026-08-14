import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function daysBetween(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - date.getTime()) / 86_400_000);
}

@Injectable()
export class RemindersService {
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

  async queue() {
    const companyId = await this.companyId();
    const today = fromToday();
    const soon = new Date(today);
    soon.setUTCDate(soon.getUTCDate() + 7);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        amountDueCents: { gt: 0 },
        status: { notIn: ["DRAFT", "CANCELLED", "PAID", "CREDITED"] },
        dueDate: { lte: today },
      },
      include: { client: true, reminders: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const quotes = await this.prisma.quote.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["SENT", "PENDING"] },
        validUntil: { lte: soon },
      },
      include: { client: true, reminders: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const invoiceItems = invoices.map((invoice) => {
      const lastLevel = invoice.reminders[0]?.level ?? null;
      return {
        target: "INVOICE" as const,
        id: invoice.id,
        documentNumber: invoice.invoiceNumber ?? "Brouillon",
        clientName: invoice.client.name,
        clientId: invoice.clientId,
        amountCents: invoice.amountDueCents,
        date: toIsoDate(invoice.dueDate),
        days: daysBetween(toIsoDate(invoice.dueDate)),
        lastLevel,
        nextLevel: (lastLevel ? Math.min(lastLevel + 1, 3) : 1) as 1 | 2 | 3,
      };
    });

    const quoteItems = quotes.map((quote) => {
      const lastLevel = quote.reminders[0]?.level ?? null;
      return {
        target: "QUOTE" as const,
        id: quote.id,
        documentNumber: quote.quoteNumber,
        clientName: quote.client.name,
        clientId: quote.clientId,
        amountCents: quote.totalTtcCents,
        date: toIsoDate(quote.validUntil),
        days: daysBetween(toIsoDate(quote.validUntil)),
        lastLevel,
        nextLevel: (lastLevel ? Math.min(lastLevel + 1, 3) : 1) as 1 | 2 | 3,
      };
    });

    return [...invoiceItems, ...quoteItems].sort((a, b) => b.days - a.days);
  }

  async summary() {
    const queue = await this.queue();
    const overdue = queue.filter((item) => item.target === "INVOICE");
    const quotes = queue.filter((item) => item.target === "QUOTE");
    return {
      overdueCount: overdue.length,
      overdueCents: overdue.reduce((sum, item) => sum + item.amountCents, 0),
      quotesSoonCount: quotes.length,
      quotesSoonCents: quotes.reduce((sum, item) => sum + item.amountCents, 0),
    };
  }

  async exportQueueCsv() {
    const queue = await this.queue();
    const header = ["Type", "Numéro", "Client", "Date", "Jours", "Montant EUR", "Dernier niveau"];
    const lines = queue.map((item) =>
      [
        item.target === "INVOICE" ? "Facture" : "Devis",
        item.documentNumber,
        item.clientName,
        item.date,
        String(item.days),
        (item.amountCents / 100).toFixed(2).replace(".", ","),
        item.lastLevel ? String(item.lastLevel) : "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(";"),
    );
    return `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
  }

  async list() {
    const companyId = await this.companyId();
    const items = await this.prisma.reminder.findMany({
      where: { companyId },
      include: { invoice: { include: { client: true } }, quote: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return items.map((item) => ({
      id: item.id,
      companyId: item.companyId,
      target: item.target,
      invoiceId: item.invoiceId,
      quoteId: item.quoteId,
      documentNumber:
        item.invoice?.invoiceNumber ?? item.quote?.quoteNumber ?? "—",
      clientName: item.invoice?.client.name ?? item.quote?.client.name ?? "—",
      level: item.level,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateReminderDto) {
    const companyId = await this.companyId();
    if (!dto.invoiceId && !dto.quoteId) {
      throw new BadRequestException("Indiquez une facture ou un devis à relancer.");
    }
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, companyId } });
      if (!invoice) throw new NotFoundException("Facture introuvable");
    }
    if (dto.quoteId) {
      const quote = await this.prisma.quote.findFirst({ where: { id: dto.quoteId, companyId } });
      if (!quote) throw new NotFoundException("Devis introuvable");
    }
    const reminder = await this.prisma.reminder.create({
      data: {
        companyId,
        target: dto.invoiceId ? "INVOICE" : "QUOTE",
        invoiceId: dto.invoiceId ?? null,
        quoteId: dto.quoteId ?? null,
        level: dto.level,
        notes: dto.notes?.trim() ?? "",
      },
      include: { invoice: { include: { client: true } }, quote: { include: { client: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        companyId,
        entity: "reminder",
        entityId: reminder.id,
        action: "create",
        payload: JSON.stringify({ level: dto.level, target: reminder.target }),
      },
    });
    return {
      id: reminder.id,
      companyId: reminder.companyId,
      target: reminder.target,
      invoiceId: reminder.invoiceId,
      quoteId: reminder.quoteId,
      documentNumber: reminder.invoice?.invoiceNumber ?? reminder.quote?.quoteNumber ?? "—",
      clientName: reminder.invoice?.client.name ?? reminder.quote?.client.name ?? "—",
      level: reminder.level,
      notes: reminder.notes,
      createdAt: reminder.createdAt.toISOString(),
    };
  }
}

function fromToday(): Date {
  const iso = todayIso();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
