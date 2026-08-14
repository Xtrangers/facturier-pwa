import {
  addDaysIso,
  centsToEuroInput,
  computeQuoteTotals,
  eurosToCents,
  formatEur,
  parseQuantity,
  PRODUCT_UNIT_LABEL,
  TAX_RATE_OPTIONS,
  todayIso,
} from "@facturier/shared";
import type {
  Client,
  DiscountKind,
  Product,
  ProductUnit,
  QuoteLinePayload,
  QuotePayload,
} from "@facturier/shared";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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

type FormLine = {
  key: string;
  productId: string;
  designation: string;
  description: string;
  quantity: string;
  unit: ProductUnit;
  unitPrice: string;
  discountKind: DiscountKind;
  discountInput: string;
  taxRateBps: number;
};

function newLine(): FormLine {
  return {
    key: crypto.randomUUID(),
    productId: "",
    designation: "",
    description: "",
    quantity: "1",
    unit: "PIECE",
    unitPrice: "0,00",
    discountKind: "NONE",
    discountInput: "0",
    taxRateBps: 2000,
  };
}

function discountValueOf(line: FormLine): number {
  if (line.discountKind === "AMOUNT") return eurosToCents(line.discountInput);
  if (line.discountKind === "PERCENT") {
    const n = Number(line.discountInput.replace(",", "."));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

export function QuoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [validUntil, setValidUntil] = useState(addDaysIso(todayIso(), 30));
  const [lines, setLines] = useState<FormLine[]>([newLine()]);
  const [catalogQ, setCatalogQ] = useState("");
  const [discountKind, setDiscountKind] = useState<DiscountKind>("NONE");
  const [discountInput, setDiscountInput] = useState("0");
  const [travelFee, setTravelFee] = useState("0,00");
  const [travelTax, setTravelTax] = useState(2000);
  const [deposit, setDeposit] = useState("0,00");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.listClients({ status: "ACTIVE", pageSize: 100 }),
      api.listProducts({ status: "ACTIVE", pageSize: 100 }),
    ]).then(([clientData, productData]) => {
      setClients(clientData.items);
      setProducts(productData.items);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    api.getQuote(id).then((quote) => {
      if (quote.status !== "DRAFT") {
        navigate(`/devis/${quote.id}`, { replace: true });
        return;
      }
      setClientId(quote.clientId);
      setIssueDate(quote.issueDate);
      setValidUntil(quote.validUntil);
      setDiscountKind(quote.discountKind);
      setDiscountInput(
        quote.discountKind === "AMOUNT" ? centsToEuroInput(quote.discountValue) : String(quote.discountValue),
      );
      setTravelFee(centsToEuroInput(quote.travelFeeCents));
      setTravelTax(quote.travelFeeTaxRateBps);
      setDeposit(centsToEuroInput(quote.depositCents));
      setNotes(quote.notes);
      setTerms(quote.terms);
      setInternalNotes(quote.internalNotes);
      setLines(
        quote.lines.map((line) => ({
          key: line.id,
          productId: line.productId ?? "",
          designation: line.designation,
          description: line.description,
          quantity: String(line.quantity).replace(".", ","),
          unit: line.unit,
          unitPrice: centsToEuroInput(line.unitPriceCents),
          discountKind: line.discountKind,
          discountInput:
            line.discountKind === "AMOUNT" ? centsToEuroInput(line.discountValue) : String(line.discountValue),
          taxRateBps: line.taxRateBps,
        })),
      );
    });
  }, [id, navigate]);

  const catalog = useMemo(() => {
    const q = catalogQ.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalogQ, products]);

  const computed = useMemo(() => {
    const globalValue =
      discountKind === "AMOUNT"
        ? eurosToCents(discountInput)
        : discountKind === "PERCENT"
          ? Math.max(0, Math.round(Number(discountInput.replace(",", ".")) || 0))
          : 0;
    return computeQuoteTotals({
      lines: lines.map((line) => ({
        quantity: parseQuantity(line.quantity),
        unitPriceCents: eurosToCents(line.unitPrice),
        discountKind: line.discountKind,
        discountValue: discountValueOf(line),
        taxRateBps: line.taxRateBps,
      })),
      travelFeeCents: eurosToCents(travelFee),
      travelFeeTaxRateBps: travelTax,
      discountKind,
      discountValue: globalValue,
    });
  }, [lines, travelFee, travelTax, discountKind, discountInput]);

  function patchLine(key: string, patch: Partial<FormLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addProduct(product: Product) {
    setLines((current) => [
      ...current.filter((line) => line.designation.trim() || line.productId),
      {
        key: crypto.randomUUID(),
        productId: product.id,
        designation: product.name,
        description: product.description,
        quantity: "1",
        unit: product.unit,
        unitPrice: centsToEuroInput(product.salePriceHtCents),
        discountKind: "NONE",
        discountInput: "0",
        taxRateBps: product.taxRateBps,
      },
    ]);
    setCatalogQ("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Choisissez un client.");
      return;
    }
    const payloadLines: QuoteLinePayload[] = [];
    for (const line of lines) {
      if (!line.designation.trim()) continue;
      const quantity = parseQuantity(line.quantity);
      if (quantity <= 0) {
        setError(`Quantité invalide pour « ${line.designation} ».`);
        return;
      }
      payloadLines.push({
        productId: line.productId || undefined,
        designation: line.designation.trim(),
        description: line.description.trim(),
        quantity,
        unit: line.unit,
        unitPriceCents: eurosToCents(line.unitPrice),
        discountKind: line.discountKind,
        discountValue: discountValueOf(line),
        taxRateBps: line.taxRateBps,
      });
    }
    if (payloadLines.length === 0) {
      setError("Ajoutez au moins une ligne.");
      return;
    }
    const payload: QuotePayload = {
      clientId,
      issueDate,
      validUntil,
      notes,
      terms,
      internalNotes,
      discountKind,
      discountValue:
        discountKind === "AMOUNT"
          ? eurosToCents(discountInput)
          : discountKind === "PERCENT"
            ? Math.max(0, Math.round(Number(discountInput.replace(",", ".")) || 0))
            : 0,
      travelFeeCents: eurosToCents(travelFee),
      travelFeeTaxRateBps: travelTax,
      depositCents: eurosToCents(deposit),
      lines: payloadLines,
    };
    setSaving(true);
    try {
      const saved = editing && id ? await api.updateQuote(id, payload) : await api.createQuote(payload);
      navigate(`/devis/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error && err.message.includes("bloqué") ? "Ce client est bloqué." : "Enregistrement impossible. Vérifiez les lignes et l’API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link to={id ? `/devis/${id}` : "/devis"} className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{editing ? "Modifier le devis" : "Nouveau devis"}</h1>
        <p className="mt-1 text-sm text-stone-500">Le numéro est attribué automatiquement (D-AAAA-00001).</p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 lg:grid-cols-3">
        <Field label="Client">
          <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Choisir un client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.clientNumber})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date d’émission">
          <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label="Valable jusqu’au">
          <input type="date" className={inputClass} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-lg">Lignes</h2>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, newLine()])}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Ligne libre
          </button>
        </div>

        <Field label="Ajouter depuis le catalogue">
          <input
            className={inputClass}
            value={catalogQ}
            onChange={(e) => setCatalogQ(e.target.value)}
            placeholder="Rechercher une référence ou une désignation…"
          />
        </Field>
        {catalogQ.trim() ? (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
            {catalog.length === 0 ? (
              <li className="px-3 py-2 text-sm text-stone-500">Aucun article</li>
            ) : (
              catalog.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50"
                  >
                    <span>
                      <span className="font-medium text-teal-800">{product.sku}</span> {product.name}
                    </span>
                    <span className="text-stone-500">{formatEur(product.salePriceHtCents)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        <div className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.key} className="space-y-3 rounded-xl border border-stone-100 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Ligne {index + 1}</p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setLines((current) => (current.length === 1 ? [newLine()] : current.filter((item) => item.key !== line.key)))}
                  aria-label="Supprimer la ligne"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Field label="Désignation">
                <input className={inputClass} value={line.designation} onChange={(e) => patchLine(line.key, { designation: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Quantité">
                  <input className={inputClass} inputMode="decimal" value={line.quantity} onChange={(e) => patchLine(line.key, { quantity: e.target.value })} />
                </Field>
                <Field label="Unité">
                  <select className={inputClass} value={line.unit} onChange={(e) => patchLine(line.key, { unit: e.target.value as ProductUnit })}>
                    {(Object.keys(PRODUCT_UNIT_LABEL) as ProductUnit[]).map((unit) => (
                      <option key={unit} value={unit}>
                        {PRODUCT_UNIT_LABEL[unit]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prix HT (€)">
                  <input className={inputClass} inputMode="decimal" value={line.unitPrice} onChange={(e) => patchLine(line.key, { unitPrice: e.target.value })} />
                </Field>
                <Field label="TVA">
                  <select className={inputClass} value={line.taxRateBps} onChange={(e) => patchLine(line.key, { taxRateBps: Number(e.target.value) })}>
                    {TAX_RATE_OPTIONS.map((opt) => (
                      <option key={opt.bps} value={opt.bps}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Remise ligne">
                  <select
                    className={inputClass}
                    value={line.discountKind}
                    onChange={(e) => patchLine(line.key, { discountKind: e.target.value as DiscountKind, discountInput: "0" })}
                  >
                    <option value="NONE">Aucune</option>
                    <option value="PERCENT">Pourcentage</option>
                    <option value="AMOUNT">Montant €</option>
                  </select>
                </Field>
                {line.discountKind !== "NONE" ? (
                  <Field label={line.discountKind === "PERCENT" ? "Remise %" : "Remise €"}>
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={line.discountInput}
                      onChange={(e) => patchLine(line.key, { discountInput: e.target.value })}
                    />
                  </Field>
                ) : (
                  <div />
                )}
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">Total HT</p>
                  <p className="flex h-11 items-center font-semibold text-stone-900">
                    {formatEur(computed.lines[index]?.lineHtCents ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg">Remise, déplacement, acompte</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Remise globale">
              <select className={inputClass} value={discountKind} onChange={(e) => setDiscountKind(e.target.value as DiscountKind)}>
                <option value="NONE">Aucune</option>
                <option value="PERCENT">Pourcentage</option>
                <option value="AMOUNT">Montant €</option>
              </select>
            </Field>
            {discountKind !== "NONE" ? (
              <Field label={discountKind === "PERCENT" ? "Remise %" : "Remise €"}>
                <input className={inputClass} inputMode="decimal" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} />
              </Field>
            ) : null}
            <Field label="Frais de déplacement HT (€)">
              <input className={inputClass} inputMode="decimal" value={travelFee} onChange={(e) => setTravelFee(e.target.value)} />
            </Field>
            <Field label="TVA déplacement">
              <select className={inputClass} value={travelTax} onChange={(e) => setTravelTax(Number(e.target.value))}>
                {TAX_RATE_OPTIONS.map((opt) => (
                  <option key={opt.bps} value={opt.bps}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Acompte (€)">
              <input className={inputClass} inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg">Totaux</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Lignes HT</span>
              <span>{formatEur(computed.linesHtCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Déplacement</span>
              <span>{formatEur(computed.travelHtCents)}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>Remise</span>
              <span>− {formatEur(computed.discountCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total HT</span>
              <span>{formatEur(computed.totalHtCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">TVA</span>
              <span>{formatEur(computed.totalTaxCents)}</span>
            </div>
            <div className="flex justify-between border-t border-stone-100 pt-3">
              <span className="font-semibold">Total TTC</span>
              <span className="font-serif text-2xl text-teal-800">{formatEur(computed.totalTtcCents)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Notes</h2>
        <Field label="Note client (figurera sur le PDF)">
          <textarea className="min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Conditions particulières">
          <textarea className="min-h-20 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
        <Field label="Notes internes">
          <textarea className="min-h-20 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Ne figureront pas sur les PDF." />
        </Field>
      </section>

      <div className="flex justify-end gap-2 pb-8">
        <Link to={id ? `/devis/${id}` : "/devis"} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-stone-600">
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
