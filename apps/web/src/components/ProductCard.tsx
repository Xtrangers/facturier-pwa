import {
  formatEur,
  formatMarginPercent,
  PRODUCT_TYPE_LABEL,
  PRODUCT_UNIT_LABEL,
} from "@facturier/shared";
import type { Product } from "@facturier/shared";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductStatusBadge } from "./StatusBadge";

type Props = {
  product: Product;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ProductCard({ product, onDuplicate, onDelete }: Props) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/tarifs/${product.id}`} className="min-w-0">
          <p className="text-xs font-medium text-teal-800">{product.sku}</p>
          <h2 className="truncate font-semibold text-stone-900">{product.name}</h2>
          <p className="text-sm text-stone-500">
            {PRODUCT_TYPE_LABEL[product.type]} · {product.categoryName ?? "Sans catégorie"} · {PRODUCT_UNIT_LABEL[product.unit]}
          </p>
        </Link>
        <ProductStatusBadge status={product.status} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">{formatEur(product.salePriceHtCents)} HT</p>
          <p className="text-xs text-stone-500">Marge {formatMarginPercent(product.purchasePriceCents, product.salePriceHtCents)}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            onClick={() => onDuplicate(product.id)}
            aria-label="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete(product.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Link
            to={`/tarifs/${product.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            aria-label="Ouvrir"
          >
            <MoreVertical className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
