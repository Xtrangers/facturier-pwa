import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

function parseSiret(value: string): string {
  return value.replace(/\s/g, "");
}

@Injectable()
export class ClientsService {
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

  private map(client: Prisma.ClientGetPayload<{ include: { contacts: true } }>) {
    const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];
    return {
      id: client.id,
      companyId: client.companyId,
      clientNumber: client.clientNumber,
      name: client.name,
      type: client.type,
      status: client.status,
      billingAddress: {
        line1: client.billingLine1,
        line2: client.billingLine2,
        postalCode: client.billingPostalCode,
        city: client.billingCity,
        country: client.billingCountry,
      },
      shippingSameAsBilling: client.shippingSameAsBilling,
      shippingAddress: {
        line1: client.shippingLine1,
        line2: client.shippingLine2,
        postalCode: client.shippingPostalCode,
        city: client.shippingCity,
        country: client.shippingCountry,
      },
      phone: client.phone,
      email: client.email,
      siret: client.siret,
      vatNumber: client.vatNumber,
      notes: client.notes,
      balanceCents: client.balanceCents,
      contacts: client.contacts,
      contactName: primary ? `${primary.firstName} ${primary.lastName}`.trim() : undefined,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  private addressFields(dto: CreateClientDto | UpdateClientDto) {
    const billing = dto.billingAddress;
    const same = dto.shippingSameAsBilling !== false;
    const shipping = same ? billing : dto.shippingAddress ?? billing;
    return {
      billingLine1: billing?.line1 ?? "",
      billingLine2: billing?.line2 ?? "",
      billingPostalCode: billing?.postalCode ?? "",
      billingCity: billing?.city ?? "",
      billingCountry: billing?.country ?? "FR",
      shippingSameAsBilling: same,
      shippingLine1: shipping?.line1 ?? "",
      shippingLine2: shipping?.line2 ?? "",
      shippingPostalCode: shipping?.postalCode ?? "",
      shippingCity: shipping?.city ?? "",
      shippingCountry: shipping?.country ?? "FR",
    };
  }

  async list(query: { q?: string; type?: string; status?: string; page?: string; pageSize?: string }) {
    const companyId = await this.companyId();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: Prisma.ClientWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q } },
        { clientNumber: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { billingCity: { contains: q } },
        { siret: { contains: q.replace(/\s/g, "") } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        include: { contacts: true },
        orderBy: { clientNumber: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items: items.map((c) => this.map(c)), total, page, pageSize };
  }

  async get(id: string) {
    const companyId = await this.companyId();
    const client = await this.prisma.client.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { contacts: true },
    });
    if (!client) throw new NotFoundException("Client introuvable");
    return this.map(client);
  }

  private async nextNumber(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.companySettings.findUnique({ where: { companyId } });
      if (!settings) throw new NotFoundException("Paramètres entreprise manquants");
      const seq = settings.nextClientSeq;
      const clientNumber = `${settings.clientPrefix}-${String(seq).padStart(5, "0")}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextClientSeq: seq + 1 },
      });
      return clientNumber;
    });
  }

  async create(dto: CreateClientDto) {
    const companyId = await this.companyId();
    const clientNumber = await this.nextNumber(companyId);
    const siret = parseSiret(dto.siret ?? "");
    const client = await this.prisma.client.create({
      data: {
        companyId,
        clientNumber,
        name: dto.name.trim(),
        type: dto.type,
        status: dto.status ?? "ACTIVE",
        ...this.addressFields(dto),
        phone: dto.phone ?? "",
        email: dto.email ?? "",
        siret,
        vatNumber: dto.vatNumber ?? "",
        notes: dto.notes ?? "",
        contacts: dto.primaryContact
          ? {
              create: {
                firstName: dto.primaryContact.firstName,
                lastName: dto.primaryContact.lastName,
                role: dto.primaryContact.role ?? "",
                email: dto.primaryContact.email ?? "",
                phone: dto.primaryContact.phone ?? "",
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: { contacts: true },
    });
    await this.audit(companyId, client.id, "create", { clientNumber });
    return this.map(client);
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.get(id);
    const siret = dto.siret !== undefined ? parseSiret(dto.siret) : undefined;
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        status: dto.status,
        ...(dto.billingAddress ? this.addressFields(dto) : {}),
        phone: dto.phone,
        email: dto.email,
        siret,
        vatNumber: dto.vatNumber,
        notes: dto.notes,
      },
      include: { contacts: true },
    });

    if (dto.primaryContact) {
      const primary = client.contacts.find((c) => c.isPrimary);
      if (primary) {
        await this.prisma.clientContact.update({
          where: { id: primary.id },
          data: {
            firstName: dto.primaryContact.firstName,
            lastName: dto.primaryContact.lastName,
            role: dto.primaryContact.role ?? "",
            email: dto.primaryContact.email ?? "",
            phone: dto.primaryContact.phone ?? "",
          },
        });
      } else {
        await this.prisma.clientContact.create({
          data: {
            clientId: id,
            firstName: dto.primaryContact.firstName,
            lastName: dto.primaryContact.lastName,
            role: dto.primaryContact.role ?? "",
            email: dto.primaryContact.email ?? "",
            phone: dto.primaryContact.phone ?? "",
            isPrimary: true,
          },
        });
      }
    }

    await this.audit(existing.companyId, id, "update", {});
    return this.get(id);
  }

  async remove(id: string) {
    const existing = await this.get(id);
    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(existing.companyId, id, "delete", { clientNumber: existing.clientNumber });
    return { ok: true };
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    const copy = await this.create({
      name: `${source.name} (copie)`,
      type: source.type as "INDIVIDUAL" | "COMPANY",
      status: source.status === "BLOCKED" ? "INACTIVE" : (source.status as "ACTIVE" | "INACTIVE" | "BLOCKED"),
      billingAddress: source.billingAddress,
      shippingSameAsBilling: source.shippingSameAsBilling,
      shippingAddress: source.shippingAddress,
      phone: source.phone,
      email: "",
      siret: "",
      vatNumber: source.vatNumber,
      notes: source.notes,
      primaryContact: source.contacts[0]
        ? {
            firstName: source.contacts[0].firstName,
            lastName: source.contacts[0].lastName,
            role: source.contacts[0].role,
            email: source.contacts[0].email,
            phone: source.contacts[0].phone,
          }
        : undefined,
    });
    await this.audit(source.companyId, copy.id, "duplicate", { from: source.id });
    return copy;
  }

  async exportCsv() {
    const { items } = await this.list({ page: "1", pageSize: "1000" });
    const header = [
      "Numéro",
      "Nom",
      "Type",
      "Statut",
      "E-mail",
      "Téléphone",
      "SIRET",
      "TVA",
      "Adresse",
      "CP",
      "Ville",
      "Solde EUR",
    ];
    const typeLabel = { INDIVIDUAL: "Particulier", COMPANY: "Entreprise" } as const;
    const statusLabel = { ACTIVE: "Actif", INACTIVE: "Inactif", BLOCKED: "Bloqué" } as const;
    const lines = items.map((c) =>
      [
        c.clientNumber,
        c.name,
        typeLabel[c.type as keyof typeof typeLabel] ?? c.type,
        statusLabel[c.status as keyof typeof statusLabel] ?? c.status,
        c.email,
        c.phone,
        c.siret,
        c.vatNumber,
        c.billingAddress.line1,
        c.billingAddress.postalCode,
        c.billingAddress.city,
        (c.balanceCents / 100).toFixed(2).replace(".", ","),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    return `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
  }

  private async audit(companyId: string, entityId: string, action: string, payload: unknown) {
    await this.prisma.auditLog.create({
      data: {
        companyId,
        entity: "client",
        entityId,
        action,
        payload: JSON.stringify(payload),
      },
    });
  }
}
