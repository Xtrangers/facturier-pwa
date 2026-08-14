import { formatDateFr, formatEur, QUOTE_STATUS_LABEL } from "@facturier/shared";
import type { Quote, QuoteStatus } from "@facturier/shared";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { QuoteCard } from "../components/QuoteCard";
import { SearchInput } from "../components/SearchInput";
import { QuoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const statuses: { value: "" | QuoteStatus; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "DRAFT", label: QUOTE_STATUS_LABEL.DRAFT },
  { value: "SENT", label: QUOTE_STATUS_LABEL.SENT },
  { value: "PENDING", label: QUOTE_STATUS_LABEL.PENDING },
  { value: "ACCEPTED", label: QUOTE_STATUS_LABEL.ACCEPTED },
  { value: "REJECTED", label: QUOTE_STATUS_LABEL.REJECTED },
  { value: "EXPIRED", label: QUOTE_STATUS_LABEL.EXPIRED },
  { value: "CONVERTED", label: QUOTE_STATUS_LABEL.CONVERTED },
];

export function QuotesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"" | QuoteStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Quote | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listQuotes({ q: debounced, status });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Impossible de charger les devis. Vérifiez que l’API tourne.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [debounced, status]);

  const stats = useMemo(() => {
    const open = items.filter((quote) => quote.status === "SENT" || quote.status === "PENDING");
    const accepted = items.filter((quote) => quote.status === "ACCEPTED");
    const pipeline = [...open, ...accepted].reduce((sum, quote) => sum + quote.totalTtcCents, 0);
    return { open: open.length, accepted: accepted.length, pipeline };
  }, [items]);

  async function onDuplicate(id: string) {
    const copy = await api.duplicateQuote(id);
    navigate(`/devis/${copy.id}/modifier`);
  }

  async function onConfirmDelete() {
    if (!toDelete) return;
    await api.deleteQuote(toDelete.id);
    setToDelete(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        subtitle={`${total} devis · ${stats.open} en cours sur cette page`}
        actions={
          <Link
            to="/devis/nouveau"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
          >
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Devis</p>
          <p className="mt-1 font-serif text-2xl">{total}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">En cours (page)</p>
          <p className="mt-1 font-serif text-2xl">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Pipeline TTC (page)</p>
          <p className="mt-1 font-serif text-2xl text-teal-800">{formatEur(stats.pipeline)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un n°, un client…" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | QuoteStatus)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {statuses.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun devis"
          description="Créez un premier devis à partir d’un client et du catalogue tarifs."
          action={
            <Link to="/devis/nouveau" className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
              Nouveau devis
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onDuplicate={onDuplicate}
                onDelete={quote.status === "DRAFT" ? (id) => setToDelete(items.find((item) => item.id === id) ?? null) : undefined}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Validité</th>
                  <th className="px-4 py-3 text-right font-medium">HT</th>
                  <th className="px-4 py-3 text-right font-medium">TTC</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((quote) => (
                  <tr key={quote.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="px-4 py-3 font-medium text-teal-800">{quote.quoteNumber}</td>
                    <td className="px-4 py-3">
                      <Link to={`/devis/${quote.id}`} className="font-semibold text-stone-900 hover:underline">
                        {quote.clientName}
                      </Link>
                      <p className="text-xs text-stone-500">{quote.clientNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDateFr(quote.issueDate)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDateFr(quote.validUntil)}</td>
                    <td className="px-4 py-3 text-right text-stone-700">{formatEur(quote.totalHtCents)}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">{formatEur(quote.totalTtcCents)}</td>
                    <td className="px-4 py-3">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900" onClick={() => void onDuplicate(quote.id)}>
                          Dupliquer
                        </button>
                        {quote.status === "DRAFT" ? (
                          <button type="button" className="text-xs font-medium text-red-600 hover:text-red-800" onClick={() => setToDelete(quote)}>
                            Supprimer
                          </button>
                        ) : null}
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
        title="Supprimer ce brouillon ?"
        message={toDelete ? `${toDelete.quoteNumber} — ${toDelete.clientName} sera archivé.` : ""}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
