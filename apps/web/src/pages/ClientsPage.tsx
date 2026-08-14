import { CLIENT_TYPE_LABEL, formatEur } from "@facturier/shared";
import type { Client, ClientStatus, ClientType } from "@facturier/shared";
import { Download, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClientCard } from "../components/ClientCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const types: { value: "" | ClientType; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "INDIVIDUAL", label: "Particulier" },
  { value: "COMPANY", label: "Entreprise" },
];

const statuses: { value: "" | ClientStatus; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "ACTIVE", label: "Actif" },
  { value: "INACTIVE", label: "Inactif" },
  { value: "BLOCKED", label: "Bloqué" },
];

export function ClientsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<"" | ClientType>("");
  const [status, setStatus] = useState<"" | ClientStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listClients({ q: debounced, type, status });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Impossible de charger les clients. Vérifiez que l’API tourne.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [debounced, type, status]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.status === "ACTIVE").length;
    const due = items.reduce((sum, c) => sum + Math.max(0, c.balanceCents), 0);
    return { active, due };
  }, [items]);

  async function onDuplicate(id: string) {
    const copy = await api.duplicateClient(id);
    navigate(`/clients/${copy.id}/modifier`);
  }

  async function onConfirmDelete() {
    if (!toDelete) return;
    await api.deleteClient(toDelete.id);
    setToDelete(null);
    await load();
  }

  async function onExport() {
    const blob = await api.exportClientsCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${total} fiche${total > 1 ? "s" : ""} · ${stats.active} actif${stats.active > 1 ? "s" : ""} sur cette page`}
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
              to="/clients/nouveau"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
            >
              <Plus className="h-4 w-4" />
              Nouveau client
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Fiches</p>
          <p className="mt-1 font-serif text-2xl">{total}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Actifs (page)</p>
          <p className="mt-1 font-serif text-2xl">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Soldes dus (page)</p>
          <p className="mt-1 font-serif text-2xl text-amber-800">{formatEur(stats.due)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un nom, n°, ville, e-mail…" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "" | ClientType)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {types.map((t) => (
            <option key={t.label} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ClientStatus)}
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
          title="Aucun client"
          description="Ajoutez une première fiche pour créer ensuite des devis et des factures."
          action={
            <Link to="/clients/nouveau" className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
              Nouveau client
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((client) => (
              <ClientCard key={client.id} client={client} onDuplicate={onDuplicate} onDelete={(id) => setToDelete(items.find((c) => c.id === id) ?? null)} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Ville</th>
                  <th className="px-4 py-3 text-right font-medium">Solde</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((client) => (
                  <tr key={client.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="px-4 py-3 font-medium text-teal-800">{client.clientNumber}</td>
                    <td className="px-4 py-3">
                      <Link to={`/clients/${client.id}`} className="font-semibold text-stone-900 hover:underline">
                        {client.name}
                      </Link>
                      <p className="text-xs text-stone-500">{client.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{CLIENT_TYPE_LABEL[client.type]}</td>
                    <td className="px-4 py-3 text-stone-600">{client.email || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{client.billingAddress.city}</td>
                    <td className={`px-4 py-3 text-right font-medium ${client.balanceCents > 0 ? "text-amber-700" : "text-stone-700"}`}>
                      {formatEur(client.balanceCents)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900" onClick={() => void onDuplicate(client.id)}>
                          Dupliquer
                        </button>
                        <button type="button" className="text-xs font-medium text-red-600 hover:text-red-800" onClick={() => setToDelete(client)}>
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
        title="Supprimer ce client ?"
        message={
          toDelete
            ? `${toDelete.name} (${toDelete.clientNumber}) sera archivé. Les documents liés resteront dans l’historique.`
            : ""
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
