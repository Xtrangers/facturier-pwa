export const ClientType = {
  INDIVIDUAL: "INDIVIDUAL",
  COMPANY: "COMPANY",
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];

export const ClientStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  INDIVIDUAL: "Particulier",
  COMPANY: "Entreprise",
};

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  BLOCKED: "Bloqué",
};

export const UserRole = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  ACCOUNTANT: "ACCOUNTANT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductType = {
  MATERIAL: "MATERIAL",
  LABOR: "LABOR",
  SERVICE: "SERVICE",
  TRAVEL: "TRAVEL",
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  MATERIAL: "Matériel",
  LABOR: "Main-d’œuvre",
  SERVICE: "Service",
  TRAVEL: "Frais de déplacement",
};

export const ProductUnit = {
  PIECE: "PIECE",
  HOUR: "HOUR",
  DAY: "DAY",
  METER: "METER",
  FLAT: "FLAT",
} as const;
export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

export const PRODUCT_UNIT_LABEL: Record<ProductUnit, string> = {
  PIECE: "Pièce",
  HOUR: "Heure",
  DAY: "Jour",
  METER: "Mètre",
  FLAT: "Forfait",
};

export const ProductStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Actif",
  ARCHIVED: "Archivé",
};

export const TAX_RATE_OPTIONS = [
  { bps: 0, label: "0 %" },
  { bps: 550, label: "5,5 %" },
  { bps: 1000, label: "10 %" },
  { bps: 2000, label: "20 %" },
] as const;
