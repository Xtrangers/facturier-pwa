import { formatDateFr, formatEur } from "@facturier/shared";
import type { CreditNote } from "@facturier/shared";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { CreditNoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

export function CreditNotesPage() {
  const [items, setItems] = useState<CreditNote[]>([]);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    api
      .listCreditNotes({ q: debounced })
      .then((data) => setItems(data.items))
      .catch(() => setError("Impossible de charger les avoirs."))
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avoirs"
        subtitle="Correction d’une facture émise, jamais de suppression."
        actions={
          <Link to="/avoirs/nouveau" className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Nouvel avoir
          </Link>
        }
      />
      <SearchInput value={q} onChange={setQ} placeholder="Rechercher un n°, un motif, un client…" />
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucun avoir" description="Créez un avoir depuis une facture émise pour corriger un montant." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Facture</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Motif</th>
                <th className="px-4 py-3 text-right font-medium">TTC</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((note) => (
                <tr key={note.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-teal-800">
                    <Link to={`/avoirs/${note.id}`} className="hover:underline">
                      {note.creditNumber ?? "Brouillon"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/factures/${note.invoiceId}`} className="hover:underline">
                      {note.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{note.clientName}</td>
                  <td className="px-4 py-3 text-stone-600">{note.reason}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatEur(note.totalTtcCents)}</td>
                  <td className="px-4 py-3">
                    <CreditNoteStatusBadge status={note.status} />
                    <p className="text-xs text-stone-500">{formatDateFr(note.issueDate)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
