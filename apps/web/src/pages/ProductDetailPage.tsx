import {
  centsToEuroInput,
  eurosToCents,
  formatEur,
  formatMarginPercent,
  formatTaxRate,
  PRODUCT_TYPE_LABEL,
  PRODUCT_UNIT_LABEL,
  ttcFromHt,
} from "@facturier/shared";
import type { Product } from "@facturier/shared";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProductStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p className="mt-1 text-sm text-stone-900">{value || "—"}</p>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then(setProduct)
      .catch(() => setError("Article introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!product) return <p className="text-sm text-stone-500">Chargement…</p>;

  const ttc = ttcFromHt(product.salePriceHtCents, product.taxRateBps);

  return (
    <div className="space-y-6">
      <Link to="/tarifs" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Tarifs et matériels
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-800">{product.sku}</p>
          <h1 className="font-serif text-3xl text-stone-900">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={product.status} />
            <span className="text-sm text-stone-500">{PRODUCT_TYPE_LABEL[product.type]}</span>
            {product.categoryName ? <span className="text-sm text-stone-500">· {product.categoryName}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const copy = await api.duplicateProduct(product.id);
              navigate(`/tarifs/${copy.id}/modifier`);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Copy className="h-4 w-4" />
            Dupliquer
          </button>
          <Link
            to={`/tarifs/${product.id}/modifier`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="font-serif text-lg">Fiche article</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Unité" value={PRODUCT_UNIT_LABEL[product.unit]} />
            <Field label="Catégorie" value={product.categoryName ?? undefined} />
            <Field label="Code-barres" value={product.barcode} />
            <Field
              label="Stock"
              value={product.stockQty === null ? "Non suivi" : String(product.stockQty)}
            />
            <Field label="Prix d’achat" value={formatEur(product.purchasePriceCents)} />
            <Field label="Prix de vente HT" value={formatEur(product.salePriceHtCents)} />
            <Field label="TVA" value={formatTaxRate(product.taxRateBps)} />
            <Field label="Prix TTC" value={formatEur(ttc)} />
          </div>
          {product.description ? (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{product.description}</p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Prix de vente HT</p>
            <p className="mt-2 font-serif text-3xl text-stone-900">{formatEur(product.salePriceHtCents)}</p>
            <p className="mt-1 text-xs text-stone-500">
              {formatEur(ttc)} TTC · {formatTaxRate(product.taxRateBps)}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Marge</p>
            <p className="mt-2 font-serif text-3xl text-teal-800">
              {formatMarginPercent(product.purchasePriceCents, product.salePriceHtCents)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Achat {centsToEuroInput(product.purchasePriceCents)} € → vente {centsToEuroInput(product.salePriceHtCents)} € HT
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Archiver cet article ?"
        message={`${product.name} sera retiré du catalogue.`}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await api.deleteProduct(product.id);
          navigate("/tarifs");
        }}
      />
    </div>
  );
}
