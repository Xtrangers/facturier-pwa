import { formatDateFr, formatEur, formatTaxRate, todayIso } from "@facturier/shared";
import type { InvoiceStatus, Report } from "@facturier/shared";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

export function ReportsPage() {
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(todayIso);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(start = from, end = to) {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.getReport({ from: start, to: end }));
    } catch {
      setError("Impossible de charger le rapport.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onExport() {
    const blob = await api.exportReportCsv({ from, to });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rapports"
        subtitle="Chiffre d’affaires, TVA, encaissements et impayés."
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

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="block flex-1">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Du</span>
          <input type="date" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block flex-1">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Au</span>
          <input type="date" className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" className="h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white">
          Actualiser
        </button>
      </form>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading || !report ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">CA HT</p>
              <p className="mt-1 font-serif text-2xl">{formatEur(report.htCents)}</p>
              <p className="text-xs text-stone-500">{report.invoiceCount} facture{report.invoiceCount > 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">TVA</p>
              <p className="mt-1 font-serif text-2xl">{formatEur(report.taxCents)}</p>
              <p className="text-xs text-stone-500">{formatEur(report.ttcCents)} TTC</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Encaissé</p>
              <p className="mt-1 font-serif text-2xl text-emerald-800">{formatEur(report.paidCents)}</p>
              <p className="text-xs text-stone-500">{report.paymentCount} paiement{report.paymentCount > 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Impayés</p>
              <p className="mt-1 font-serif text-2xl text-amber-800">{formatEur(report.dueCents)}</p>
              <p className="text-xs text-red-700">{formatEur(report.overdueCents)} échus</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="font-serif text-lg">TVA collectée</h2>
            {report.vat.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune facture émise sur la période.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Taux</th>
                      <th className="px-4 py-3 text-right font-medium">HT</th>
                      <th className="px-4 py-3 text-right font-medium">TVA</th>
                      <th className="px-4 py-3 text-right font-medium">TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.vat.map((row) => (
                      <tr key={row.taxRateBps} className="border-t border-stone-100">
                        <td className="px-4 py-3 font-medium">{formatTaxRate(row.taxRateBps)}</td>
                        <td className="px-4 py-3 text-right">{formatEur(row.htCents)}</td>
                        <td className="px-4 py-3 text-right">{formatEur(row.taxCents)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatEur(row.ttcCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {report.months.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-lg">Par mois</h2>
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mois</th>
                      <th className="px-4 py-3 text-right font-medium">HT</th>
                      <th className="px-4 py-3 text-right font-medium">TVA</th>
                      <th className="px-4 py-3 text-right font-medium">TTC</th>
                      <th className="px-4 py-3 text-right font-medium">Encaissé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((row) => (
                      <tr key={row.month} className="border-t border-stone-100">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className="px-4 py-3 text-right">{formatEur(row.htCents)}</td>
                        <td className="px-4 py-3 text-right">{formatEur(row.taxCents)}</td>
                        <td className="px-4 py-3 text-right">{formatEur(row.ttcCents)}</td>
                        <td className="px-4 py-3 text-right text-emerald-800">{formatEur(row.paidCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-lg">Impayés</h2>
              <Link to="/relances" className="text-sm font-medium text-teal-800 hover:underline">
                Relances
              </Link>
            </div>
            {report.unpaid.length === 0 ? (
              <EmptyState title="Aucun impayé" description="Toutes les factures émises sont soldées sur cette clôture." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">N°</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Échéance</th>
                      <th className="px-4 py-3 text-right font-medium">Restant</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.unpaid.map((row) => (
                      <tr key={row.id} className="border-t border-stone-100">
                        <td className="px-4 py-3">
                          <Link to={`/factures/${row.id}`} className="font-medium text-teal-800 hover:underline">
                            {row.invoiceNumber ?? "Brouillon"}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{row.clientName}</td>
                        <td className="px-4 py-3 text-stone-600">{formatDateFr(row.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-800">{formatEur(row.amountDueCents)}</td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={row.status as InvoiceStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
