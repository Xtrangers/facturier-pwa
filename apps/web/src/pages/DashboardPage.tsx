import { formatDateFr, formatEur, REMINDER_LEVEL_LABEL } from "@facturier/shared";
import type { Dashboard, InvoiceStatus, ReminderLevel } from "@facturier/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

function Kpi({
  label,
  value,
  hint,
  tone,
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "warning" | "default";
  to?: string;
}) {
  const color =
    tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-800" : "text-stone-900";
  const body = (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:border-teal-700">
      {body}
    </Link>
  ) : (
    body
  );
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => setError("Impossible de charger le tableau de bord."));
  }, []);

  if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-stone-500">Chargement…</p>;

  const maxMonth = Math.max(1, ...data.months.map((month) => month.ttcCents));
  const { kpis } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        subtitle={`Atelier Nord Lumière · ${kpis.year} · ${kpis.clientCount} client${kpis.clientCount > 1 ? "s" : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/factures/nouveau" className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white">
              Nouvelle facture
            </Link>
            <Link to="/rapports" className="inline-flex h-11 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium">
              Rapports
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`CA TTC ${kpis.year}`} value={formatEur(kpis.revenueTtcCents)} hint={`${formatEur(kpis.paidCents)} encaissé`} />
        <Kpi label="Restant dû" value={formatEur(kpis.dueCents)} tone="warning" to="/rapports" />
        <Kpi
          label="Échus"
          value={formatEur(kpis.overdueCents)}
          hint={`${kpis.overdueCount} facture${kpis.overdueCount > 1 ? "s" : ""}`}
          tone="danger"
          to="/relances"
        />
        <Kpi
          label="Devis ouverts"
          value={String(kpis.quotesOpenCount)}
          hint={formatEur(kpis.quotesOpenCents)}
          to="/devis"
        />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Facturation {kpis.year}</h2>
        <p className="mt-1 text-sm text-stone-500">Total TTC des factures émises, par mois.</p>
        <div className="mt-6 flex h-40 items-end gap-1.5 sm:gap-2">
          {data.months.map((month) => (
            <div key={month.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className="w-full max-w-8 rounded-t-md bg-teal-800/85"
                style={{ height: `${Math.max(4, Math.round((month.ttcCents / maxMonth) * 120))}px` }}
                title={`${month.label} : ${formatEur(month.ttcCents)}`}
              />
              <span className="text-[10px] text-stone-500 sm:text-xs">{month.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-lg">À relancer</h2>
            <Link to="/relances" className="text-sm font-medium text-teal-800 hover:underline">
              Voir tout
            </Link>
          </div>
          {data.reminderQueue.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">Rien à relancer.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {data.reminderQueue.map((item) => (
                <li key={`${item.target}-${item.id}`}>
                  <Link
                    to={item.target === "INVOICE" ? `/factures/${item.id}` : `/devis/${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">{item.clientName}</p>
                      <p className="text-xs text-stone-500">
                        {item.documentNumber} · {item.days > 0 ? `${item.days} j de retard` : item.days === 0 ? "aujourd’hui" : `dans ${-item.days} j`}
                        {item.lastLevel ? ` · ${REMINDER_LEVEL_LABEL[item.lastLevel as ReminderLevel]}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-amber-800">{formatEur(item.amountCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-lg">Dernières factures</h2>
            <Link to="/factures" className="text-sm font-medium text-teal-800 hover:underline">
              Voir tout
            </Link>
          </div>
          {data.recentInvoices.length === 0 ? (
            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">Aucune facture émise.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {data.recentInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link to={`/factures/${invoice.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invoice.number}</p>
                      <p className="text-xs text-stone-500">
                        {invoice.clientName} · {formatDateFr(invoice.date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                      <p className="mt-1 text-xs font-medium">{formatEur(invoice.amountCents)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.topDebtors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-lg">Clients à recouvrer</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.topDebtors.map((client) => (
              <li key={client.clientId}>
                <Link to={`/clients/${client.clientId}`} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:bg-stone-50">
                  <p className="truncate text-sm font-semibold text-stone-900">{client.clientName}</p>
                  <p className="mt-1 font-serif text-xl text-amber-800">{formatEur(client.balanceCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
