import {
  centsToEuroInput,
  eurosToCents,
  formatMarginPercent,
  PRODUCT_TYPE_LABEL,
  PRODUCT_UNIT_LABEL,
  TAX_RATE_OPTIONS,
} from "@facturier/shared";
import type { ProductCategory, ProductPayload, ProductStatus, ProductType, ProductUnit } from "@facturier/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

const NEW_CATEGORY = "__new__";

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryChoice, setCategoryChoice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [type, setType] = useState<ProductType>("MATERIAL");
  const [unit, setUnit] = useState<ProductUnit>("PIECE");
  const [purchase, setPurchase] = useState("0,00");
  const [sale, setSale] = useState("0,00");
  const [taxRateBps, setTaxRateBps] = useState(2000);
  const [stock, setStock] = useState("");
  const [trackStock, setTrackStock] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.listProductCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!id) return;
    api.getProduct(id).then((product) => {
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description);
      setCategoryChoice(product.categoryId ?? "");
      setType(product.type);
      setUnit(product.unit);
      setPurchase(centsToEuroInput(product.purchasePriceCents));
      setSale(centsToEuroInput(product.salePriceHtCents));
      setTaxRateBps(product.taxRateBps);
      setTrackStock(product.stockQty !== null);
      setStock(product.stockQty === null ? "" : String(product.stockQty));
      setBarcode(product.barcode);
      setStatus(product.status);
    });
  }, [id]);

  const purchaseCents = eurosToCents(purchase);
  const saleCents = eurosToCents(sale);
  const margin = useMemo(
    () => formatMarginPercent(purchaseCents, saleCents),
    [purchaseCents, saleCents],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("La désignation est obligatoire.");
      return;
    }
    if (categoryChoice === NEW_CATEGORY && !newCategory.trim()) {
      setError("Indiquez le nom de la nouvelle catégorie.");
      return;
    }
    const payload: ProductPayload = {
      sku: sku.trim() || undefined,
      name: name.trim(),
      description: description.trim(),
      categoryId: categoryChoice === NEW_CATEGORY ? undefined : categoryChoice,
      categoryName: categoryChoice === NEW_CATEGORY ? newCategory.trim() : undefined,
      type,
      unit,
      purchasePriceCents: purchaseCents,
      salePriceHtCents: saleCents,
      taxRateBps,
      stockQty: trackStock ? Number(stock || 0) : null,
      barcode: barcode.trim(),
      status,
    };
    setSaving(true);
    try {
      const saved = editing && id ? await api.updateProduct(id, payload) : await api.createProduct(payload);
      navigate(`/tarifs/${saved.id}`);
    } catch {
      setError("Enregistrement impossible. Vérifiez la référence (unique) et l’API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <Link to={id ? `/tarifs/${id}` : "/tarifs"} className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{editing ? "Modifier l’article" : "Nouvel article"}</h1>
        <p className="mt-1 text-sm text-stone-500">
          Laissez la référence vide pour une attribution automatique (ART-00001).
        </p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Référence">
            <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ART-00001" />
          </Field>
          <Field label="Statut">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              <option value="ACTIVE">Actif</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </Field>
        </div>
        <Field label="Désignation">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Description détaillée">
          <textarea
            className="min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as ProductType)}>
              {(Object.keys(PRODUCT_TYPE_LABEL) as ProductType[]).map((key) => (
                <option key={key} value={key}>
                  {PRODUCT_TYPE_LABEL[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unité">
            <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)}>
              {(Object.keys(PRODUCT_UNIT_LABEL) as ProductUnit[]).map((key) => (
                <option key={key} value={key}>
                  {PRODUCT_UNIT_LABEL[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catégorie">
            <select className={inputClass} value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>Nouvelle catégorie…</option>
            </select>
          </Field>
          {categoryChoice === NEW_CATEGORY ? (
            <Field label="Nom de la catégorie">
              <input className={inputClass} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            </Field>
          ) : (
            <Field label="Code-barres">
              <input className={inputClass} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </Field>
          )}
        </div>
        {categoryChoice === NEW_CATEGORY ? (
          <Field label="Code-barres">
            <input className={inputClass} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </Field>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Tarif</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prix d’achat (€)">
            <input className={inputClass} inputMode="decimal" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
          </Field>
          <Field label="Prix de vente HT (€)">
            <input className={inputClass} inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} />
          </Field>
          <Field label="Taux de TVA">
            <select className={inputClass} value={taxRateBps} onChange={(e) => setTaxRateBps(Number(e.target.value))}>
              {TAX_RATE_OPTIONS.map((opt) => (
                <option key={opt.bps} value={opt.bps}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-stone-700">Marge calculée</p>
            <p className="flex h-11 items-center rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-teal-800">
              {margin}
            </p>
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
          Suivre le stock
        </label>
        {trackStock ? (
          <Field label="Quantité en stock">
            <input
              className={inputClass}
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        ) : null}
      </section>

      <div className="flex justify-end gap-2 pb-8">
        <Link to={id ? `/tarifs/${id}` : "/tarifs"} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-stone-600">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
