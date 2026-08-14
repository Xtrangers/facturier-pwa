import {
  ARCHIVE_KIND_LABEL,
  CREDIT_NOTE_STATUS_LABEL,
  formatDateFr,
  formatEur,
  INVOICE_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
} from "@facturier/shared";
import type { ArchiveDocument, ArchiveDocumentKind, CreditNoteStatus, InvoiceStatus, QuoteStatus } from "@facturier/shared";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { CreditNoteStatusBadge, InvoiceStatusBadge, QuoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const kinds: { value: "" | ArchiveDocumentKind; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "QUOTE", label: "Devis" },
  { value: "INVOICE", label: "Factures" },
  { value: "CREDIT_NOTE", label: "Avoirs" },
];

function StatusCell({ item }: { item: ArchiveDocument }) {
  if (item.kind === "QUOTE") return <QuoteStatusBadge status={item.status as QuoteStatus} />;
  if (item.kind === "INVOICE") return <InvoiceStatusBadge status={item.status as InvoiceStatus} />;
  return <CreditNoteStatusBadge status={item.status as CreditNoteStatus} />;
}

function statusLabel(item: ArchiveDocument) {
  if (item.kind === "QUOTE") return QUOTE_STATUS_LABEL[item.status as QuoteStatus] ?? item.status;
  if (item.kind === "INVOICE") return INVOICE_STATUS_LABEL[item.status as InvoiceStatus] ?? item.status;
  return CREDIT_NOTE_STATUS_LABEL[item.status as CreditNoteStatus] ?? item.status;
}

export function DocumentsPage() {
  const [items, setItems] = useState<ArchiveDocument[]>([]);
  const [counts, setCounts] = useState({ quoteCount: 0, invoiceCount: 0, creditCount: 0 });
  const [totalTtcCents, setTotalTtcCents] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [kind, setKind] = useState<"" | ArchiveDocumentKind>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    api
      .listDocuments({
        q: debounced,
        kind: kind || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then((data) => {
        setItems(data.items);
        setTotalTtcCents(data.totalTtcCents);
        setCounts({ quoteCount: data.quoteCount, invoiceCount: data.invoiceCount, creditCount: data.creditCount });
      })
      .catch(() => setError("Impossible de charger les documents."))
      .finally(() => setLoading(false));
  }, [debounced, kind, from, to]);

  async function onExport() {
    const blob = await api.exportDocumentsCsv({
      q: debounced,
      kind: kind || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Archive des devis, factures et avoirs. PDF depuis chaque fiche."
        actions={
          <button
            type="button"
            onClick={() => void onExport()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        }
      />

      <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Téléchargez ou envoyez le PDF depuis la fiche du document. Les notes internes n’y figurent pas.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            { key: "QUOTE" as const, label: "Devis", value: counts.quoteCount },
            { key: "INVOICE" as const, label: "Factures", value: counts.invoiceCount },
            { key: "CREDIT_NOTE" as const, label: "Avoirs", value: counts.creditCount },
          ] as const
        ).map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setKind(kind === card.key ? "" : card.key)}
            className={`rounded-2xl border p-4 text-left ${
              kind === card.key ? "border-teal-800 bg-teal-50" : "border-stone-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{card.label}</p>
            <p className="mt-1 font-serif text-2xl">{card.value}</p>
          </button>
        ))}
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">TTC affiché</p>
          <p className="mt-1 font-serif text-2xl">{formatEur(totalTtcCents)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {kinds.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setKind(item.value)}
            className={`h-11 rounded-xl px-4 text-sm font-medium ${
              kind === item.value ? "bg-teal-800 text-white" : "border border-stone-200 bg-white text-stone-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un n°, un client…" />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Du</span>
          <input
            type="date"
            className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Au</span>
          <input
            type="date"
            className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucun document" description="Les devis, factures et avoirs apparaîtront ici." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((item) => (
              <Link key={`${item.kind}-${item.id}`} to={item.href} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-teal-800">
                  {ARCHIVE_KIND_LABEL[item.kind]} · {item.number}
                </p>
                <h2 className="font-semibold text-stone-900">{item.clientName}</h2>
                <p className="text-sm text-stone-500">
                  {formatDateFr(item.issueDate)} · {statusLabel(item)}
                </p>
                <p className="mt-2 font-medium">{formatEur(item.totalTtcCents)}</p>
              </Link>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">TTC</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`} className="border-t border-stone-100">
                    <td className="px-4 py-3 text-stone-600">{ARCHIVE_KIND_LABEL[item.kind]}</td>
                    <td className="px-4 py-3">
                      <Link to={item.href} className="font-medium text-teal-800 hover:underline">
                        {item.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/clients/${item.clientId}`} className="hover:underline">
                        {item.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDateFr(item.issueDate)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatEur(item.totalTtcCents)}</td>
                    <td className="px-4 py-3">
                      <StatusCell item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
