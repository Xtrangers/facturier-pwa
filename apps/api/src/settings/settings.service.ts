import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { isValidSiret, parseSiret } from "@facturier/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function padSeq(seq: number) {
  return String(seq).padStart(5, "0");
}

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async companyRecord() {
    const company = await this.prisma.company.findFirst({
      where: { name: DEMO_COMPANY_NAME },
      include: { settings: true },
    });
    if (!company) {
      const fallback = await this.prisma.company.findFirst({ include: { settings: true } });
      if (!fallback) throw new NotFoundException("Aucune entreprise configurée");
      return fallback;
    }
    return company;
  }

  private async ensureSettings(companyId: string) {
    const existing = await this.prisma.companySettings.findUnique({ where: { companyId } });
    if (existing) return existing;
    return this.prisma.companySettings.create({ data: { companyId } });
  }

  private map(
    company: {
      id: string;
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
      paymentTerms: string;
      iban: string;
      bic: string;
    },
    settings: {
      clientPrefix: string;
      quotePrefix: string;
      invoicePrefix: string;
      creditPrefix: string;
      nextClientSeq: number;
      nextQuoteSeq: number;
      nextInvoiceSeq: number;
      nextCreditSeq: number;
      defaultTaxRateBps: number;
      defaultDueDays: number;
      pdfPrimaryColor: string;
      legalMentions: string;
      termsAndConditions: string;
    },
  ) {
    const year = String(new Date().getFullYear());
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl ?? "",
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      postalCode: company.postalCode,
      city: company.city,
      country: company.country,
      phone: company.phone,
      email: company.email,
      siret: company.siret,
      vatNumber: company.vatNumber,
      paymentTerms: company.paymentTerms,
      iban: company.iban,
      bic: company.bic,
      clientPrefix: settings.clientPrefix,
      quotePrefix: settings.quotePrefix,
      invoicePrefix: settings.invoicePrefix,
      creditPrefix: settings.creditPrefix,
      nextClientSeq: settings.nextClientSeq,
      nextQuoteSeq: settings.nextQuoteSeq,
      nextInvoiceSeq: settings.nextInvoiceSeq,
      nextCreditSeq: settings.nextCreditSeq,
      defaultTaxRateBps: settings.defaultTaxRateBps,
      defaultDueDays: settings.defaultDueDays,
      pdfPrimaryColor: settings.pdfPrimaryColor,
      legalMentions: settings.legalMentions,
      termsAndConditions: settings.termsAndConditions,
      nextClientNumber: `${settings.clientPrefix}-${padSeq(settings.nextClientSeq)}`,
      nextQuoteNumber: `${settings.quotePrefix}-${year}-${padSeq(settings.nextQuoteSeq)}`,
      nextInvoiceNumber: `${settings.invoicePrefix}-${year}-${padSeq(settings.nextInvoiceSeq)}`,
      nextCreditNumber: `${settings.creditPrefix}-${year}-${padSeq(settings.nextCreditSeq)}`,
    };
  }

  async get() {
    const company = await this.companyRecord();
    const settings = await this.ensureSettings(company.id);
    return this.map(company, settings);
  }

  async update(dto: UpdateSettingsDto) {
    const siret = parseSiret(dto.siret ?? "");
    if (!isValidSiret(siret)) {
      throw new BadRequestException("Le SIRET doit contenir 14 chiffres.");
    }
    const company = await this.companyRecord();
    await this.ensureSettings(company.id);

    const [updatedCompany, updatedSettings] = await this.prisma.$transaction([
      this.prisma.company.update({
        where: { id: company.id },
        data: {
          name: dto.name.trim(),
          logoUrl: dto.logoUrl?.trim() || null,
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() ?? "",
          postalCode: dto.postalCode.trim(),
          city: dto.city.trim(),
          country: dto.country?.trim() || "FR",
          phone: dto.phone?.trim() ?? "",
          email: dto.email?.trim() ?? "",
          siret,
          vatNumber: dto.vatNumber?.trim() ?? "",
          paymentTerms: dto.paymentTerms?.trim() || "Paiement à 30 jours",
          iban: dto.iban?.trim() ?? "",
          bic: dto.bic?.trim().toUpperCase() ?? "",
        },
      }),
      this.prisma.companySettings.update({
        where: { companyId: company.id },
        data: {
          clientPrefix: dto.clientPrefix?.toUpperCase() ?? undefined,
          quotePrefix: dto.quotePrefix?.toUpperCase() ?? undefined,
          invoicePrefix: dto.invoicePrefix?.toUpperCase() ?? undefined,
          creditPrefix: dto.creditPrefix?.toUpperCase() ?? undefined,
          defaultTaxRateBps: dto.defaultTaxRateBps,
          defaultDueDays: dto.defaultDueDays,
          pdfPrimaryColor: dto.pdfPrimaryColor,
          legalMentions: dto.legalMentions ?? undefined,
          termsAndConditions: dto.termsAndConditions ?? undefined,
        },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        companyId: company.id,
        entity: "company",
        entityId: company.id,
        action: "update",
        payload: JSON.stringify({ name: updatedCompany.name }),
      },
    });

    return this.map(updatedCompany, updatedSettings);
  }
}
