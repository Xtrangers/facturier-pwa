import type { ProductStatus, ProductType, ProductUnit } from "./enums";

export type ProductCategory = {
  id: string;
  companyId: string;
  name: string;
  productCount?: number;
};

export type Product = {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  type: ProductType;
  unit: ProductUnit;
  purchasePriceCents: number;
  salePriceHtCents: number;
  taxRateBps: number;
  stockQty: number | null;
  barcode: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductPayload = {
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string | null;
  categoryName?: string;
  type: ProductType;
  unit: ProductUnit;
  purchasePriceCents?: number;
  salePriceHtCents: number;
  taxRateBps?: number;
  stockQty?: number | null;
  barcode?: string;
  status?: ProductStatus;
};
