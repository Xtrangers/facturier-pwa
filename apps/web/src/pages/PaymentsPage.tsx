import {
  centsToEuroInput,
  eurosToCents,
  formatDateFr,
  formatEur,
  PAYMENT_METHOD_LABEL,
  todayIso,
} from "@facturier/shared";
import type { OpenInvoice, Payment, PaymentMethod } from "@facturier/shared";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { api } from "../lib/api";

function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

type Period = "all" | "month" | "year";

export function PaymentsPage() {
  const [params] = useSearchParams();
  const [items, setItems] = useState<Payment[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState(params.get("facture") ?? "");
  const [amount, setAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("TRANSFER");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const range = useMemo(() => {
    if (period === "month") return { from: monthStart(), to: todayIso() };
    if (period === "year") return { from: yearStart(), to: todayIso() };
    return { from: from || undefined, to: to || undefined };
  }, [period, from, to]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [listed, open] = await Promise.all([
        api.listPayments({
          q: debounced,
          method: method || undefined,
          from: range.from,
          to: range.to,
        }),
        api.listOpenInvoices(),
      ]);
      setItems(listed.items);
      setTotalCents(listed.totalCents);
      setOpenInvoices(open);
      const selectedId = invoiceId || params.get("facture") || "";
      if (selectedId) {
        const selected = open.find((invoice) => invoice.id === selectedId);
        if (selected) {
          setInvoiceId(selected.id);
          setAmount((current) => current || centsToEuroInput(selected.amountDueCents));
        }
      }
    } catch {
      setError("Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [debounced, method, range.from, range.to]);

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!invoiceId) {
      setError("Choisissez une facture.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.recordPayment({
        invoiceId,
        amountCents: eurosToCents(amount),
        method: payMethod,
        paidAt,
        reference,
        notes,
      });
      setReference("");
      setNotes("");
      setInvoiceId("");
      setAmount("");
      await load();
    } catch {
      setError("Paiement refusé. Vérifiez le montant et le restant dû.");
    } finally {
      setSaving(false);
    }
  }

  async function onExport() {
    const blob = await api.exportPaymentsCsv({
      q: debounced,
      method: method || undefined,
      from: range.from,
      to: range.to,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paiements.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const dueCents = openInvoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paiements"
        subtitle="Encaissements enregistrés sur les factures émises."
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Encaissé (filtre)</p>
          <p className="mt-1 font-serif text-3xl text-emerald-800">{formatEur(totalCents)}</p>
          <p className="text-xs text-stone-500">
            {items.length} paiement{items.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Restant à encaisser</p>
          <p className="mt-1 font-serif text-3xl text-amber-800">{formatEur(dueCents)}</p>
          <p className="text-xs text-stone-500">
            {openInvoices.length} facture{openInvoices.length > 1 ? "s" : ""} ouverte{openInvoices.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Enregistrer un paiement</h2>
        {openInvoices.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Aucune facture avec un restant dû.</p>
        ) : (
          <form onSubmit={onPay} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Facture</span>
              <select
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                value={invoiceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInvoiceId(id);
                  const selected = openInvoices.find((invoice) => invoice.id === id);
                  if (selected) setAmount(centsToEuroInput(selected.amountDueCents));
                }}
                required
              >
                <option value="">Choisir</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} — {invoice.clientName} ({centsToEuroInput(invoice.amountDueCents)} € dus)
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Montant (€)</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Moyen</span>
              <select
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Date</span>
              <input
                type="date"
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </label>
            <label className="lg:col-span-3">
              <span className="mb-1.5 block text-sm font-medium">Référence</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="VIR-…"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Note interne</span>
              <input
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="h-11 w-full rounded-xl bg-teal-800 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: "Tout" },
            { value: "month", label: "Ce mois" },
            { value: "year", label: "Cette année" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setPeriod(item.value);
              if (item.value !== "all") {
                setFrom("");
                setTo("");
              }
            }}
            className={`h-11 rounded-xl px-4 text-sm font-medium ${
              period === item.value ? "bg-teal-800 text-white" : "border border-stone-200 bg-white text-stone-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher une facture, un client, une référence…" />
        <select
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value as "" | PaymentMethod)}
        >
          <option value="">Tous les moyens</option>
          {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((key) => (
            <option key={key} value={key}>
              {PAYMENT_METHOD_LABEL[key]}
            </option>
          ))}
        </select>
        {period === "all" ? (
          <>
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
          </>
        ) : null}
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucun paiement" description="Enregistrez un encaissement ici ou depuis une facture émise." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((payment) => (
              <article key={payment.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <Link to={`/factures/${payment.invoiceId}`} className="block">
                  <p className="text-xs font-medium text-teal-800">{payment.invoiceNumber ?? "Facture"}</p>
                  <h2 className="font-semibold">{payment.clientName}</h2>
                  <p className="text-sm text-stone-500">
                    {formatDateFr(payment.paidAt)} · {PAYMENT_METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}
                  </p>
                  {payment.reference ? <p className="text-xs text-stone-500">{payment.reference}</p> : null}
                </Link>
                <p className="mt-2 font-serif text-xl text-emerald-800">{formatEur(payment.amountCents)}</p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Facture</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Moyen</th>
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {items.map((payment) => (
                  <tr key={payment.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">{formatDateFr(payment.paidAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/factures/${payment.invoiceId}`} className="font-medium text-teal-800 hover:underline">
                        {payment.invoiceNumber ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/clients/${payment.clientId}`} className="hover:underline">
                        {payment.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{PAYMENT_METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}</td>
                    <td className="px-4 py-3 text-stone-500">{payment.reference || "—"}</td>
                    <td className="px-4 py-3 text-stone-500">{payment.notes || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-800">{formatEur(payment.amountCents)}</td>
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
