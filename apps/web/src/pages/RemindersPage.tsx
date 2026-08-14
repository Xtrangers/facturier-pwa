import { formatDateFr, formatEur, REMINDER_LEVEL_LABEL } from "@facturier/shared";
import type { Reminder, ReminderLevel, ReminderQueueItem } from "@facturier/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function RemindersPage() {
  const [queue, setQueue] = useState<ReminderQueueItem[]>([]);
  const [history, setHistory] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [q, h] = await Promise.all([api.reminderQueue(), api.listReminders()]);
      setQueue(q);
      setHistory(h);
    } catch {
      setError("Impossible de charger les relances.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remind(item: ReminderQueueItem, level: ReminderLevel) {
    setBusyId(item.id);
    try {
      await api.createReminder({
        invoiceId: item.target === "INVOICE" ? item.id : undefined,
        quoteId: item.target === "QUOTE" ? item.id : undefined,
        level,
        notes: `${REMINDER_LEVEL_LABEL[level]} — ${item.documentNumber}`,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Relances" subtitle="Factures en retard et devis proches de l’expiration." />
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="font-serif text-xl">À relancer</h2>
        {queue.length === 0 ? (
          <EmptyState title="Rien à relancer" description="Aucune facture en retard ni devis bientôt expiré." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
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
                {queue.map((item) => (
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
                    <td className="px-4 py-3">{item.clientName}</td>
                    <td className="px-4 py-3">{formatDateFr(item.date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatEur(item.amountCents)}</td>
                    <td className="px-4 py-3 text-amber-800">
                      {item.days > 0 ? `${item.days} j` : item.days === 0 ? "Aujourd’hui" : `dans ${-item.days} j`}
                      {item.lastLevel ? <p className="text-xs text-stone-500">Dernière : niveau {item.lastLevel}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void remind(item, ((item.lastLevel ?? 0) + 1 <= 3 ? ((item.lastLevel ?? 0) + 1) : 3) as ReminderLevel)}
                        className="h-11 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Relancer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <p className="font-medium">{item.documentNumber} · {item.clientName}</p>
                  <p className="text-xs text-stone-500">{REMINDER_LEVEL_LABEL[item.level as ReminderLevel]} · {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
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
