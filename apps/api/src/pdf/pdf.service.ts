import { Inject, Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import { PrismaService } from "../prisma/prisma.service";
import { renderDocumentHtml, type PdfKind, type PdfModel } from "./document-html";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private browser: Browser | null = null;

  private storageDir() {
    return path.resolve(process.cwd(), "storage", "pdfs");
  }

  private async company() {
    const found = await this.prisma.company.findFirst({
      where: { name: DEMO_COMPANY_NAME },
      include: { settings: true },
    });
    if (found) return found;
    const fallback = await this.prisma.company.findFirst({ include: { settings: true } });
    if (!fallback) throw new NotFoundException("Aucune entreprise configurée");
    return fallback;
  }

  private async browserInstance() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }
    return this.browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async htmlToPdf(html: string) {
    const browser = await this.browserInstance();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private async persist(kind: PdfKind, id: string, filename: string, buffer: Buffer) {
    await mkdir(this.storageDir(), { recursive: true });
    const filePath = path.join(this.storageDir(), filename);
    await writeFile(filePath, buffer);
    const pdfUrl = `/api/v1/pdf/${kind === "QUOTE" ? "quotes" : kind === "INVOICE" ? "invoices" : "credit-notes"}/${id}`;
    if (kind === "QUOTE") {
      await this.prisma.quote.update({ where: { id }, data: { pdfUrl } });
    } else if (kind === "INVOICE") {
      await this.prisma.invoice.update({ where: { id }, data: { pdfUrl } });
    } else {
      await this.prisma.creditNote.update({ where: { id }, data: { pdfUrl } });
    }
    return { buffer, filename, pdfUrl, filePath };
  }

  async renderQuote(id: string) {
    const company = await this.company();
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true, lines: true },
    });
    if (!quote) throw new NotFoundException("Devis introuvable");
    const model = this.baseModel(company, quote.client, {
      kind: "QUOTE",
      number: quote.quoteNumber,
      draft: quote.status === "DRAFT",
      issueDate: toIsoDate(quote.issueDate),
      extraDateLabel: "Valable jusqu’au",
      extraDate: toIsoDate(quote.validUntil),
      lines: quote.lines,
      travelFeeCents: quote.travelFeeCents,
      travelFeeTaxRateBps: quote.travelFeeTaxRateBps,
      discountCents: quote.discountCents,
      linesHtCents: quote.linesHtCents,
      totalHtCents: quote.totalHtCents,
      totalTaxCents: quote.totalTaxCents,
      totalTtcCents: quote.totalTtcCents,
      depositCents: quote.depositCents,
      notes: quote.notes,
      terms: quote.terms,
    });
    const buffer = await this.htmlToPdf(renderDocumentHtml(model));
    const filename = `${quote.quoteNumber}.pdf`.replace(/[^\w.-]+/g, "_");
    return this.persist("QUOTE", quote.id, filename, buffer);
  }

  async renderInvoice(id: string) {
    const company = await this.company();
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true, lines: true },
    });
    if (!invoice) throw new NotFoundException("Facture introuvable");
    const model = this.baseModel(company, invoice.client, {
      kind: "INVOICE",
      number: invoice.invoiceNumber ?? "Brouillon",
      draft: invoice.status === "DRAFT",
      issueDate: toIsoDate(invoice.issueDate),
      extraDateLabel: "Échéance",
      extraDate: toIsoDate(invoice.dueDate),
      lines: invoice.lines,
      travelFeeCents: invoice.travelFeeCents,
      travelFeeTaxRateBps: invoice.travelFeeTaxRateBps,
      discountCents: invoice.discountCents,
      linesHtCents: invoice.linesHtCents,
      totalHtCents: invoice.totalHtCents,
      totalTaxCents: invoice.totalTaxCents,
      totalTtcCents: invoice.totalTtcCents,
      depositCents: invoice.depositCents,
      amountPaidCents: invoice.amountPaidCents,
      creditedCents: invoice.creditedCents,
      amountDueCents: invoice.amountDueCents,
      notes: invoice.notes,
      terms: invoice.terms,
    });
    const buffer = await this.htmlToPdf(renderDocumentHtml(model));
    const filename = `${invoice.invoiceNumber ?? `brouillon-${invoice.id.slice(-6)}`}.pdf`.replace(/[^\w.-]+/g, "_");
    return this.persist("INVOICE", invoice.id, filename, buffer);
  }

  async renderCreditNote(id: string) {
    const company = await this.company();
    const note = await this.prisma.creditNote.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { client: true, invoice: true },
    });
    if (!note) throw new NotFoundException("Avoir introuvable");
    const model = this.baseModel(company, note.client, {
      kind: "CREDIT_NOTE",
      number: note.creditNumber ?? "Brouillon",
      draft: note.status === "DRAFT",
      issueDate: toIsoDate(note.issueDate),
      extraDateLabel: "Date",
      extraDate: toIsoDate(note.issueDate),
      lines: [],
      totalHtCents: note.totalHtCents,
      totalTaxCents: note.totalTaxCents,
      totalTtcCents: note.totalTtcCents,
      notes: note.notes,
      reason: note.reason,
      relatedNumber: note.invoice.invoiceNumber ?? "Facture",
    });
    const buffer = await this.htmlToPdf(renderDocumentHtml(model));
    const filename = `${note.creditNumber ?? `brouillon-${note.id.slice(-6)}`}.pdf`.replace(/[^\w.-]+/g, "_");
    return this.persist("CREDIT_NOTE", note.id, filename, buffer);
  }

  private baseModel(
    company: {
      name: string;
      logoUrl: string | null;
      addressLine1: string;
      addressLine2: string;
      postalCode: string;
      city: string;
      country: string;
      phone: string;
      email: string;
      siret: string;
      vatNumber: string;
      iban: string;
      bic: string;
      paymentTerms: string;
      settings: { pdfPrimaryColor: string; legalMentions: string; termsAndConditions: string } | null;
    },
    client: {
      name: string;
      type: string;
      billingLine1: string;
      billingLine2: string;
      billingPostalCode: string;
      billingCity: string;
      billingCountry: string;
      siret: string;
      vatNumber: string;
    },
    rest: Partial<PdfModel> & Pick<PdfModel, "kind" | "number" | "draft" | "issueDate" | "extraDateLabel" | "extraDate">,
  ): PdfModel {
    return {
      color: company.settings?.pdfPrimaryColor ?? "#0F766E",
      logoUrl: company.logoUrl ?? "",
      company: {
        name: company.name,
        addressLine1: company.addressLine1,
        addressLine2: company.addressLine2,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country,
        phone: company.phone,
        email: company.email,
        siret: company.siret,
        vatNumber: company.vatNumber,
        iban: company.iban,
        bic: company.bic,
        paymentTerms: company.paymentTerms,
      },
      client: {
        name: client.name,
        type: client.type,
        line1: client.billingLine1,
        line2: client.billingLine2,
        postalCode: client.billingPostalCode,
        city: client.billingCity,
        country: client.billingCountry,
        siret: client.siret,
        vatNumber: client.vatNumber,
      },
      lines: [],
      travelFeeCents: 0,
      travelFeeTaxRateBps: 2000,
      discountCents: 0,
      linesHtCents: 0,
      totalHtCents: 0,
      totalTaxCents: 0,
      totalTtcCents: 0,
      depositCents: 0,
      amountPaidCents: 0,
      creditedCents: 0,
      amountDueCents: 0,
      notes: "",
      terms: "",
      legalMentions: company.settings?.legalMentions ?? "",
      termsAndConditions: company.settings?.termsAndConditions ?? "",
      reason: "",
      relatedNumber: "",
      ...rest,
    };
  }
}
