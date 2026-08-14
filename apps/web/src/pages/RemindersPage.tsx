import { formatDateFr, formatEur, REMINDER_LEVEL_LABEL } from "@facturier/shared";
import type { Reminder, ReminderLevel, ReminderQueueItem, ReminderSummary } from "@facturier/shared";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

function delayLabel(days: number) {
  if (days > 0) return `${days} j de retard`;
  if (days === 0) return "Aujourd’hui";
  return `dans ${-days} j`;
}

export function RemindersPage() {
  const [queue, setQueue] = useState<ReminderQueueItem[]>([]);
  const [history, setHistory] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [filter, setFilter] = useState<"ALL" | "INVOICE" | "QUOTE">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [q, h, s] = await Promise.all([api.reminderQueue(), api.listReminders(), api.reminderSummary()]);
      setQueue(q);
      setHistory(h);
      setSummary(s);
    } catch {
      setError("Impossible de charger les relances.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => (filter === "ALL" ? queue : queue.filter((item) => item.target === filter)),
    [queue, filter],
  );

  async function remind(item: ReminderQueueItem) {
    setBusyId(item.id);
    try {
      await api.createReminder({
        invoiceId: item.target === "INVOICE" ? item.id : undefined,
        quoteId: item.target === "QUOTE" ? item.id : undefined,
        level: item.nextLevel,
        notes: `${REMINDER_LEVEL_LABEL[item.nextLevel]} — ${item.documentNumber}`,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onExport() {
    const blob = await api.exportRemindersCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relances.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relances"
        subtitle="Factures échues et devis proches de l’expiration."
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
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Factures échues</p>
            <p className="mt-1 font-serif text-2xl text-red-700">{formatEur(summary.overdueCents)}</p>
            <p className="text-xs text-stone-500">{summary.overdueCount} à relancer</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Devis à suivre</p>
            <p className="mt-1 font-serif text-2xl text-amber-800">{formatEur(summary.quotesSoonCents)}</p>
            <p className="text-xs text-stone-500">{summary.quotesSoonCount} bientôt expirés</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "ALL", label: "Tout" },
            { value: "INVOICE", label: "Factures" },
            { value: "QUOTE", label: "Devis" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`h-11 rounded-xl px-4 text-sm font-medium ${
              filter === item.value ? "bg-teal-800 text-white" : "border border-stone-200 bg-white text-stone-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">À relancer</h2>
        {visible.length === 0 ? (
          <EmptyState title="Rien à relancer" description="Aucune facture échue ni devis bientôt expiré dans ce filtre." />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {visible.map((item) => (
                <article key={`${item.target}-${item.id}`} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <Link to={item.target === "INVOICE" ? `/factures/${item.id}` : `/devis/${item.id}`} className="block">
                    <p className="text-xs font-medium text-teal-800">{item.documentNumber}</p>
                    <h3 className="font-semibold text-stone-900">{item.clientName}</h3>
                    <p className="text-sm text-amber-800">{delayLabel(item.days)}</p>
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                    <span className="font-semibold">{formatEur(item.amountCents)}</span>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void remind(item)}
                      className="h-11 rounded-xl border border-stone-200 px-3 text-xs font-semibold disabled:opacity-60"
                    >
                      Noter
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `${item.id}-mail`}
                      onClick={async () => {
                        setBusyId(`${item.id}-mail`);
                        setError(null);
                        try {
                          await api.sendReminderMail({
                            invoiceId: item.target === "INVOICE" ? item.id : undefined,
                            quoteId: item.target === "QUOTE" ? item.id : undefined,
                            level: item.nextLevel,
                          });
                          await load();
                        } catch {
                          setError("E-mail de relance impossible. Vérifiez l’adresse du client.");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="h-11 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      E-mail {REMINDER_LEVEL_LABEL[item.nextLevel]}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Retard</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={`${item.target}-${item.id}`} className="border-t border-stone-100">
                      <td className="px-4 py-3">
                        <Link
                          to={item.target === "INVOICE" ? `/factures/${item.id}` : `/devis/${item.id}`}
                          className="font-medium text-teal-800 hover:underline"
                        >
                          {item.documentNumber}
                        </Link>
                        <p className="text-xs text-stone-500">{item.target === "INVOICE" ? "Facture" : "Devis"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/clients/${item.clientId}`} className="hover:underline">
                          {item.clientName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatDateFr(item.date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatEur(item.amountCents)}</td>
                      <td className="px-4 py-3 text-amber-800">
                        {delayLabel(item.days)}
                        {item.lastLevel ? (
                          <p className="text-xs text-stone-500">Dernière : {REMINDER_LEVEL_LABEL[item.lastLevel as ReminderLevel]}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void remind(item)}
                            className="h-11 rounded-xl border border-stone-200 px-3 text-xs font-semibold disabled:opacity-60"
                          >
                            Noter
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `${item.id}-mail`}
                            onClick={async () => {
                              setBusyId(`${item.id}-mail`);
                              setError(null);
                              try {
                                await api.sendReminderMail({
                                  invoiceId: item.target === "INVOICE" ? item.id : undefined,
                                  quoteId: item.target === "QUOTE" ? item.id : undefined,
                                  level: item.nextLevel,
                                });
                                await load();
                              } catch {
                                setError("E-mail de relance impossible. Vérifiez l’adresse du client.");
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="h-11 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            E-mail
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
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Historique</h2>
        {history.length === 0 ? (
          <p className="text-sm text-stone-500">Aucune relance enregistrée.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {item.invoiceId ? (
                      <Link to={`/factures/${item.invoiceId}`} className="hover:underline">
                        {item.documentNumber}
                      </Link>
                    ) : item.quoteId ? (
                      <Link to={`/devis/${item.quoteId}`} className="hover:underline">
                        {item.documentNumber}
                      </Link>
                    ) : (
                      item.documentNumber
                    )}{" "}
                    · {item.clientName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {REMINDER_LEVEL_LABEL[item.level as ReminderLevel]} · {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className="text-stone-500">{item.target === "INVOICE" ? "Facture" : "Devis"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
