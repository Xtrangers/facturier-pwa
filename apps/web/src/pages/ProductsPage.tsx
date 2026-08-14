import {
  formatEur,
  formatMarginPercent,
  PRODUCT_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
  PRODUCT_UNIT_LABEL,
} from "@facturier/shared";
import type { Product, ProductCategory, ProductStatus, ProductType } from "@facturier/shared";
import { Download, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { ProductCard } from "../components/ProductCard";
import { SearchInput } from "../components/SearchInput";
import { ProductStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const types: { value: "" | ProductType; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "MATERIAL", label: PRODUCT_TYPE_LABEL.MATERIAL },
  { value: "LABOR", label: PRODUCT_TYPE_LABEL.LABOR },
  { value: "SERVICE", label: PRODUCT_TYPE_LABEL.SERVICE },
  { value: "TRAVEL", label: PRODUCT_TYPE_LABEL.TRAVEL },
];

const statuses: { value: "" | ProductStatus; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "ACTIVE", label: PRODUCT_STATUS_LABEL.ACTIVE },
  { value: "ARCHIVED", label: PRODUCT_STATUS_LABEL.ARCHIVED },
];

export function ProductsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<"" | ProductType>("");
  const [status, setStatus] = useState<"" | ProductStatus>("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([
        api.listProducts({ q: debounced, type, status, categoryId }),
        api.listProductCategories(),
      ]);
      setItems(data.items);
      setTotal(data.total);
      setCategories(cats);
    } catch {
      setError("Impossible de charger les tarifs. Vérifiez que l’API tourne.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [debounced, type, status, categoryId]);

  const stats = useMemo(() => {
    const active = items.filter((p) => p.status === "ACTIVE");
    const catalog = active.reduce((sum, p) => sum + p.salePriceHtCents, 0);
    return { active: active.length, catalog };
  }, [items]);

  async function onDuplicate(id: string) {
    const copy = await api.duplicateProduct(id);
    navigate(`/tarifs/${copy.id}/modifier`);
  }

  async function onConfirmDelete() {
    if (!toDelete) return;
    await api.deleteProduct(toDelete.id);
    setToDelete(null);
    await load();
  }

  async function onExport() {
    const blob = await api.exportProductsCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tarifs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifs et matériels"
        subtitle={`${total} article${total > 1 ? "s" : ""} · ${stats.active} actif${stats.active > 1 ? "s" : ""} sur cette page`}
        actions={
          <>
            <button
              type="button"
              onClick={() => void onExport()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
            <Link
              to="/tarifs/nouveau"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
            >
              <Plus className="h-4 w-4" />
              Nouvel article
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Articles</p>
          <p className="mt-1 font-serif text-2xl">{total}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Actifs (page)</p>
          <p className="mt-1 font-serif text-2xl">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Catalogue HT (page)</p>
          <p className="mt-1 font-serif text-2xl text-teal-800">{formatEur(stats.catalog)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher une référence, désignation, code-barres…" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "" | ProductType)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {types.map((t) => (
            <option key={t.label} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ProductStatus)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {statuses.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun article"
          description="Ajoutez matériels, main-d’œuvre et prestations pour préremplir les devis."
          action={
            <Link to="/tarifs/nouveau" className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
              Nouvel article
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDuplicate={onDuplicate}
                onDelete={(id) => setToDelete(items.find((p) => p.id === id) ?? null)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Réf.</th>
                  <th className="px-4 py-3 font-medium">Désignation</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium">Prix HT</th>
                  <th className="px-4 py-3 text-right font-medium">Marge</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="px-4 py-3 font-medium text-teal-800">{product.sku}</td>
                    <td className="px-4 py-3">
                      <Link to={`/tarifs/${product.id}`} className="font-semibold text-stone-900 hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-xs text-stone-500">{PRODUCT_UNIT_LABEL[product.unit]}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{PRODUCT_TYPE_LABEL[product.type]}</td>
                    <td className="px-4 py-3 text-stone-600">{product.categoryName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">{formatEur(product.salePriceHtCents)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {formatMarginPercent(product.purchasePriceCents, product.salePriceHtCents)}
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900" onClick={() => void onDuplicate(product.id)}>
                          Dupliquer
                        </button>
                        <button type="button" className="text-xs font-medium text-red-600 hover:text-red-800" onClick={() => setToDelete(product)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Archiver cet article ?"
        message={
          toDelete
            ? `${toDelete.name} (${toDelete.sku}) sera retiré du catalogue. Les devis déjà établis ne seront pas modifiés.`
            : ""
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
