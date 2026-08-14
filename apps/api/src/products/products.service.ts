import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

const DEMO_COMPANY_NAME = "Atelier Nord Lumière";

const TYPE_LABEL = {
  MATERIAL: "Matériel",
  LABOR: "Main-d’œuvre",
  SERVICE: "Service",
  TRAVEL: "Frais de déplacement",
} as const;

const UNIT_LABEL = {
  PIECE: "Pièce",
  HOUR: "Heure",
  DAY: "Jour",
  METER: "Mètre",
  FLAT: "Forfait",
} as const;

const STATUS_LABEL = { ACTIVE: "Actif", ARCHIVED: "Archivé" } as const;

@Injectable()
export class ProductsService {
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

  private map(product: Prisma.ProductGetPayload<{ include: { category: true } }>) {
    return {
      id: product.id,
      companyId: product.companyId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      type: product.type,
      unit: product.unit,
      purchasePriceCents: product.purchasePriceCents,
      salePriceHtCents: product.salePriceHtCents,
      taxRateBps: product.taxRateBps,
      stockQty: product.stockQty,
      barcode: product.barcode,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async list(query: {
    q?: string;
    type?: string;
    status?: string;
    categoryId?: string;
    page?: string;
    pageSize?: string;
  }) {
    const companyId = await this.companyId();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: Prisma.ProductWhereInput = { companyId, deletedAt: null };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { description: { contains: q } },
        { category: { name: { contains: q } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { sku: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: items.map((p) => this.map(p)), total, page, pageSize };
  }

  async listCategories() {
    const companyId = await this.companyId();
    const categories = await this.prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    return categories.map((c) => ({
      id: c.id,
      companyId: c.companyId,
      name: c.name,
      productCount: c._count.products,
    }));
  }

  async get(id: string) {
    const companyId = await this.companyId();
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { category: true },
    });
    if (!product) throw new NotFoundException("Article introuvable");
    return this.map(product);
  }

  private async nextSku(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.companySettings.findUnique({ where: { companyId } });
      if (!settings) throw new NotFoundException("Paramètres entreprise manquants");
      const seq = settings.nextProductSeq;
      const sku = `ART-${String(seq).padStart(5, "0")}`;
      await tx.companySettings.update({
        where: { companyId },
        data: { nextProductSeq: seq + 1 },
      });
      return sku;
    });
  }

  private async resolveCategory(companyId: string, dto: CreateProductDto | UpdateProductDto) {
    const name = dto.categoryName?.trim();
    if (name) {
      return this.prisma.productCategory.upsert({
        where: { companyId_name: { companyId, name } },
        create: { companyId, name },
        update: {},
      });
    }
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) throw new NotFoundException("Catégorie introuvable");
      return category;
    }
    return null;
  }

  async create(dto: CreateProductDto) {
    const companyId = await this.companyId();
    const sku = dto.sku?.trim() || (await this.nextSku(companyId));
    const existing = await this.prisma.product.findFirst({
      where: { companyId, sku, deletedAt: null },
    });
    if (existing) throw new ConflictException("Cette référence existe déjà.");
    const category = await this.resolveCategory(companyId, dto);
    const settings = await this.prisma.companySettings.findUnique({ where: { companyId } });
    const product = await this.prisma.product.create({
      data: {
        companyId,
        sku,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? "",
        categoryId: category?.id ?? null,
        type: dto.type,
        unit: dto.unit,
        purchasePriceCents: dto.purchasePriceCents ?? 0,
        salePriceHtCents: dto.salePriceHtCents,
        taxRateBps: dto.taxRateBps ?? settings?.defaultTaxRateBps ?? 2000,
        stockQty: dto.stockQty === undefined ? null : dto.stockQty,
        barcode: dto.barcode?.trim() ?? "",
        status: dto.status ?? "ACTIVE",
      },
      include: { category: true },
    });
    await this.audit(companyId, product.id, "create", { sku });
    return this.map(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.get(id);
    if (dto.sku?.trim() && dto.sku.trim() !== existing.sku) {
      const clash = await this.prisma.product.findFirst({
        where: { companyId: existing.companyId, sku: dto.sku.trim(), deletedAt: null, NOT: { id } },
      });
      if (clash) throw new ConflictException("Cette référence existe déjà.");
    }
    const category =
      dto.categoryName !== undefined || dto.categoryId !== undefined
        ? await this.resolveCategory(existing.companyId, dto)
        : undefined;
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku?.trim(),
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        ...(category !== undefined ? { categoryId: category?.id ?? null } : {}),
        type: dto.type,
        unit: dto.unit,
        purchasePriceCents: dto.purchasePriceCents,
        salePriceHtCents: dto.salePriceHtCents,
        taxRateBps: dto.taxRateBps,
        stockQty: dto.stockQty,
        barcode: dto.barcode?.trim(),
        status: dto.status,
      },
      include: { category: true },
    });
    await this.audit(existing.companyId, id, "update", {});
    return this.map(product);
  }

  async remove(id: string) {
    const existing = await this.get(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(existing.companyId, id, "delete", { sku: existing.sku });
    return { ok: true };
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    const copy = await this.create({
      name: `${source.name} (copie)`,
      description: source.description,
      categoryId: source.categoryId ?? undefined,
      type: source.type as CreateProductDto["type"],
      unit: source.unit as CreateProductDto["unit"],
      purchasePriceCents: source.purchasePriceCents,
      salePriceHtCents: source.salePriceHtCents,
      taxRateBps: source.taxRateBps as 0 | 550 | 1000 | 2000,
      stockQty: source.stockQty,
      barcode: "",
      status: source.status === "ARCHIVED" ? "ACTIVE" : (source.status as "ACTIVE" | "ARCHIVED"),
    });
    await this.audit(source.companyId, copy.id, "duplicate", { from: source.id });
    return copy;
  }

  async exportCsv() {
    const { items } = await this.list({ page: "1", pageSize: "1000" });
    const header = [
      "Référence",
      "Désignation",
      "Type",
      "Catégorie",
      "Unité",
      "Prix d'achat EUR",
      "Prix HT EUR",
      "TVA %",
      "Stock",
      "Code-barres",
      "Statut",
    ];
    const lines = items.map((p) =>
      [
        p.sku,
        p.name,
        TYPE_LABEL[p.type as keyof typeof TYPE_LABEL] ?? p.type,
        p.categoryName ?? "",
        UNIT_LABEL[p.unit as keyof typeof UNIT_LABEL] ?? p.unit,
        (p.purchasePriceCents / 100).toFixed(2).replace(".", ","),
        (p.salePriceHtCents / 100).toFixed(2).replace(".", ","),
        (p.taxRateBps / 100).toFixed(1).replace(".", ","),
        p.stockQty ?? "",
        p.barcode,
        STATUS_LABEL[p.status as keyof typeof STATUS_LABEL] ?? p.status,
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
        entity: "product",
        entityId,
        action,
        payload: JSON.stringify(payload),
      },
    });
  }
}
