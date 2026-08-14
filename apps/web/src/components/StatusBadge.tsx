import type { ClientStatus, ProductStatus } from "@facturier/shared";
import { CLIENT_STATUS_LABEL, PRODUCT_STATUS_LABEL } from "@facturier/shared";

const clientStyles: Record<ClientStatus, string> = {
  ACTIVE: "bg-teal-50 text-teal-800 ring-teal-100",
  INACTIVE: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  BLOCKED: "bg-red-50 text-red-700 ring-red-100",
};

const productStyles: Record<ProductStatus, string> = {
  ACTIVE: "bg-teal-50 text-teal-800 ring-teal-100",
  ARCHIVED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${clientStyles[status]}`}
    >
      {CLIENT_STATUS_LABEL[status]}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${productStyles[status]}`}
    >
      {PRODUCT_STATUS_LABEL[status]}
    </span>
  );
}
