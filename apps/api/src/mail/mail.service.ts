import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { REMINDER_LEVEL_LABEL } from "@facturier/shared";
import type { MailKind, MailLog, MailStatus } from "@facturier/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PdfService } from "../pdf/pdf.service";
import { RemindersService } from "../reminders/reminders.service";
import { SendMailDto, SendReminderMailDto } from "./dto/send-mail.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

@Injectable()
export class MailService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PdfService) private readonly pdf: PdfService,
    @Inject(RemindersService) private readonly reminders: RemindersService,
  ) {}

  private async company() {
    const found = await this.prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
    if (found) return found;
    const fallback = await this.prisma.company.findFirst();
    if (!fallback) throw new NotFoundException("Aucune entreprise configurée");
    return fallback;
  }

  private map(log: {
    id: string;
    kind: string;
    quoteId: string | null;
    invoiceId: string | null;
    creditNoteId: string | null;
    reminderId: string | null;
    toEmail: string;
    subject: string;
    body: string;
    status: string;
    transport: string;
    error: string;
    pdfFilename: string;
    createdAt: Date;
  }): MailLog {
    return {
      id: log.id,
      kind: log.kind as MailKind,
      quoteId: log.quoteId,
      invoiceId: log.invoiceId,
      creditNoteId: log.creditNoteId,
      reminderId: log.reminderId,
      toEmail: log.toEmail,
      subject: log.subject,
      body: log.body,
      status: log.status as MailStatus,
      transport: log.transport === "smtp" ? "smtp" : "file",
      error: log.error,
      pdfFilename: log.pdfFilename,
      createdAt: log.createdAt.toISOString(),
    };
  }

  async list(query: { quoteId?: string; invoiceId?: string; creditNoteId?: string }) {
    const company = await this.company();
    const items = await this.prisma.mailLog.findMany({
      where: {
        companyId: company.id,
        ...(query.quoteId ? { quoteId: query.quoteId } : {}),
        ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
        ...(query.creditNoteId ? { creditNoteId: query.creditNoteId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return items.map((item) => this.map(item));
  }

  async sendQuote(id: string, dto: SendMailDto) {
    const company = await this.company();
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true },
    });
    if (!quote) throw new NotFoundException("Devis introuvable");
    const pdf = await this.pdf.renderQuote(id);
    const to = dto.to?.trim() || quote.client.email;
    const subject = dto.subject?.trim() || `Devis ${quote.quoteNumber} — ${company.name}`;
    const body =
      dto.message?.trim() ||
      `Bonjour,\n\nVeuillez trouver ci-joint notre devis ${quote.quoteNumber}.\n\nCordialement,\n${company.name}`;
    const log = await this.dispatch({
      companyId: company.id,
      from: company.email,
      to,
      subject,
      body,
      pdf,
      kind: "QUOTE",
      quoteId: quote.id,
    });
    if (log.status === "SENT" && quote.status === "DRAFT") {
      await this.prisma.quote.update({ where: { id: quote.id }, data: { status: "SENT" } });
    }
    return log;
  }

  async sendInvoice(id: string, dto: SendMailDto) {
    const company = await this.company();
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true },
    });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    const pdf = await this.pdf.renderInvoice(id);
    const number = invoice.invoiceNumber ?? "brouillon";
    const to = dto.to?.trim() || invoice.client.email;
    const subject = dto.subject?.trim() || `Facture ${number} — ${company.name}`;
    const body =
      dto.message?.trim() ||
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${number}.\n\nCordialement,\n${company.name}`;
    const log = await this.dispatch({
      companyId: company.id,
      from: company.email,
      to,
      subject,
      body,
      pdf,
      kind: "INVOICE",
      invoiceId: invoice.id,
    });
    if (log.status === "SENT" && invoice.status === "ISSUED") {
      await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } });
    }
    return log;
  }

  async sendCreditNote(id: string, dto: SendMailDto) {
    const company = await this.company();
    const note = await this.prisma.creditNote.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true },
    });
    if (!note) throw new NotFoundException("Avoir introuvable");
    const pdf = await this.pdf.renderCreditNote(id);
    const number = note.creditNumber ?? "brouillon";
    const to = dto.to?.trim() || note.client.email;
    const subject = dto.subject?.trim() || `Avoir ${number} — ${company.name}`;
    const body =
      dto.message?.trim() ||
      `Bonjour,\n\nVeuillez trouver ci-joint l’avoir ${number}.\n\nCordialement,\n${company.name}`;
    return this.dispatch({
      companyId: company.id,
      from: company.email,
      to,
      subject,
      body,
      pdf,
      kind: "CREDIT_NOTE",
      creditNoteId: note.id,
    });
  }

  async sendReminder(dto: SendReminderMailDto) {
    const company = await this.company();
    const client = dto.invoiceId
      ? await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, companyId: company.id }, include: { client: true } })
      : dto.quoteId
        ? await this.prisma.quote.findFirst({ where: { id: dto.quoteId, companyId: company.id }, include: { client: true } })
        : null;
    if (!client) throw new BadRequestException("Indiquez une facture ou un devis.");
    const to = dto.to?.trim() || client.client.email;
    if (!to) throw new BadRequestException("Aucune adresse e-mail destinataire.");
    const pdf = dto.invoiceId ? await this.pdf.renderInvoice(dto.invoiceId) : await this.pdf.renderQuote(dto.quoteId!);
    const reminder = await this.reminders.create({
      invoiceId: dto.invoiceId,
      quoteId: dto.quoteId,
      level: dto.level,
      notes: dto.message,
    });
    const levelLabel = REMINDER_LEVEL_LABEL[dto.level];
    const subject = dto.subject?.trim() || `${levelLabel} — ${reminder.documentNumber} — ${company.name}`;
    const body =
      dto.message?.trim() ||
      `Bonjour,\n\nNous vous relançons au sujet de ${reminder.documentNumber} (${levelLabel.toLowerCase()}).\nMerci de nous indiquer la suite donnée.\n\nCordialement,\n${company.name}`;
    const log = await this.dispatch({
      companyId: company.id,
      from: company.email,
      to,
      subject,
      body,
      pdf,
      kind: "REMINDER",
      quoteId: dto.quoteId,
      invoiceId: dto.invoiceId,
      reminderId: reminder.id,
    });
    return { reminder, mail: log };
  }

  private async dispatch(input: {
    companyId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    pdf: { buffer: Buffer; filename: string };
    kind: MailKind;
    quoteId?: string;
    invoiceId?: string;
    creditNoteId?: string;
    reminderId?: string;
  }) {
    if (!input.to) {
      throw new BadRequestException("Aucune adresse e-mail destinataire.");
    }
    const from = process.env.MAIL_FROM || input.from || "facturier@localhost";
    const smtpHost = process.env.SMTP_HOST?.trim();
    let status: MailStatus = "SENT";
    let transport: "smtp" | "file" = smtpHost ? "smtp" : "file";
    let error = "";

    try {
      if (smtpHost) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
            : undefined,
        });
        await transporter.sendMail({
          from,
          to: input.to,
          subject: input.subject,
          text: input.body,
          attachments: [{ filename: input.pdf.filename, content: input.pdf.buffer, contentType: "application/pdf" }],
        });
      } else {
        const transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: "unix",
          buffer: true,
        });
        const info = await transporter.sendMail({
          from,
          to: input.to,
          subject: input.subject,
          text: input.body,
          attachments: [{ filename: input.pdf.filename, content: input.pdf.buffer, contentType: "application/pdf" }],
        });
        const dir = path.resolve(process.cwd(), "storage", "mail");
        await mkdir(dir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const message = Buffer.isBuffer(info.message) ? info.message : Buffer.from(String(info.message));
        await writeFile(path.join(dir, `${stamp}-${input.pdf.filename.replace(/\.pdf$/i, "")}.eml`), message);
      }
    } catch (caught) {
      status = "FAILED";
      error = caught instanceof Error ? caught.message : "Envoi impossible";
    }

    const created = await this.prisma.mailLog.create({
      data: {
        companyId: input.companyId,
        kind: input.kind,
        quoteId: input.quoteId ?? null,
        invoiceId: input.invoiceId ?? null,
        creditNoteId: input.creditNoteId ?? null,
        reminderId: input.reminderId ?? null,
        toEmail: input.to,
        subject: input.subject,
        body: input.body,
        status,
        transport,
        error,
        pdfFilename: input.pdf.filename,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        entity: "mail",
        entityId: created.id,
        action: status === "SENT" ? "send" : "send-failed",
        payload: JSON.stringify({ kind: input.kind, to: input.to, transport }),
      },
    });
    return this.map(created);
  }
}
