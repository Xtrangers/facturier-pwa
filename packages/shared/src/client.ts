import type { Address } from "./address";
import type { ClientStatus, ClientType } from "./enums";

export type ClientContact = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

export type Client = {
  id: string;
  companyId: string;
  clientNumber: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  billingAddress: Address;
  shippingSameAsBilling: boolean;
  shippingAddress: Address;
  phone: string;
  email: string;
  siret: string;
  vatNumber: string;
  notes: string;
  balanceCents: number;
  contacts: ClientContact[];
  createdAt: string;
  updatedAt: string;
};

export type ClientListItem = Omit<Client, "contacts" | "notes" | "shippingAddress"> & {
  contactName?: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClientPayload = {
  name: string;
  type: ClientType;
  status: ClientStatus;
  billingAddress: Address;
  shippingSameAsBilling: boolean;
  shippingAddress?: Address;
  phone?: string;
  email?: string;
  siret?: string;
  vatNumber?: string;
  notes?: string;
  primaryContact?: {
    firstName: string;
    lastName: string;
    role?: string;
    email?: string;
    phone?: string;
  };
};
