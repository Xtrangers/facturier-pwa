import { formatDateFr, formatEur, INVOICE_STATUS_LABEL } from "@facturier/shared";
import type { Invoice, InvoiceStatus } from "@facturier/shared";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { InvoiceCard } from "../components/InvoiceCard";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const statuses: { value: "" | InvoiceStatus; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "DRAFT", label: INVOICE_STATUS_LABEL.DRAFT },
  { value: "ISSUED", label: INVOICE_STATUS_LABEL.ISSUED },
  { value: "SENT", label: INVOICE_STATUS_LABEL.SENT },
  { value: "PARTIAL", label: INVOICE_STATUS_LABEL.PARTIAL },
  { value: "PAID", label: INVOICE_STATUS_LABEL.PAID },
  { value: "OVERDUE", label: INVOICE_STATUS_LABEL.OVERDUE },
  { value: "CREDITED", label: INVOICE_STATUS_LABEL.CREDITED },
];

export function InvoicesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"" | InvoiceStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listInvoices({ q: debounced, status });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Impossible de charger les factures. Vérifiez que l’API tourne.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [debounced, status]);

  const stats = useMemo(() => {
    const due = items.filter((invoice) => invoice.amountDueCents > 0 && invoice.status !== "DRAFT");
    const overdue = items.filter((invoice) => invoice.status === "OVERDUE");
    return {
      due: due.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
      overdue: overdue.length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        subtitle={`${total} facture${total > 1 ? "s" : ""} · ${stats.overdue} en retard sur cette page`}
        actions={
          <Link
            to="/factures/nouveau"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Factures</p>
          <p className="mt-1 font-serif text-2xl">{total}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">En retard (page)</p>
          <p className="mt-1 font-serif text-2xl text-red-700">{stats.overdue}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Restant dû (page)</p>
          <p className="mt-1 font-serif text-2xl text-amber-800">{formatEur(stats.due)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un n°, un client…" />
        <select value={status} onChange={(e) => setStatus(e.target.value as "" | InvoiceStatus)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
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
          title="Aucune facture"
          description="Créez une facture manuellement ou transformez un devis accepté."
          action={
            <Link to="/factures/nouveau" className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
              Nouvelle facture
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onDuplicate={(invoiceId) =>
                  void api.duplicateInvoice(invoiceId).then((copy) => navigate(`/factures/${copy.id}/modifier`))
                }
                onDelete={invoice.status === "DRAFT" ? () => setToDelete(invoice) : undefined}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 text-right font-medium">TTC</th>
                <th className="px-4 py-3 text-right font-medium">Restant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((invoice) => (
                <tr key={invoice.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                  <td className="px-4 py-3 font-medium text-teal-800">{invoice.invoiceNumber ?? "Brouillon"}</td>
                  <td className="px-4 py-3">
                    <Link to={`/factures/${invoice.id}`} className="font-semibold text-stone-900 hover:underline">
                      {invoice.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatDateFr(invoice.dueDate)}</td>
                  <td className="px-4 py-3 text-right">{formatEur(invoice.totalTtcCents)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${invoice.amountDueCents > 0 ? "text-amber-800" : "text-stone-700"}`}>
                    {formatEur(invoice.amountDueCents)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-xs font-medium text-stone-500" onClick={() => void api.duplicateInvoice(invoice.id).then((copy) => navigate(`/factures/${copy.id}/modifier`))}>
                      Dupliquer
                    </button>
                    {invoice.status === "DRAFT" ? (
                      <button type="button" className="ml-2 text-xs font-medium text-red-600" onClick={() => setToDelete(invoice)}>
                        Supprimer
                      </button>
                    ) : null}
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
        message={toDelete ? `Cette facture brouillon sera archivée.` : ""}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await api.deleteInvoice(toDelete.id);
          setToDelete(null);
          await load();
        }}
      />
    </div>
  );
}
