import { centsToEuroInput, eurosToCents, formatEur, ttcFromHt } from "@facturier/shared";
import type { CreditNoteKind, Invoice } from "@facturier/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

export function CreditNoteFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState(params.get("facture") ?? "");
  const [kind, setKind] = useState<CreditNoteKind>("TOTAL");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [ht, setHt] = useState("0,00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listInvoices({ pageSize: 100 }).then((data) => {
      setInvoices(data.items.filter((invoice) => invoice.status !== "DRAFT" && invoice.amountDueCents > 0));
    });
  }, []);

  const invoice = invoices.find((item) => item.id === invoiceId);

  const preview = useMemo(() => {
    if (!invoice) return null;
    if (kind === "TOTAL") {
      return { ht: Math.round((invoice.totalHtCents * invoice.amountDueCents) / Math.max(1, invoice.totalTtcCents)), ttc: invoice.amountDueCents };
    }
    const htCents = eurosToCents(ht);
    return { ht: htCents, ttc: ttcFromHt(htCents, invoice.lines[0]?.taxRateBps ?? 2000) };
  }, [invoice, kind, ht]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!invoiceId || !reason.trim()) {
      setError("Choisissez une facture et un motif.");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createCreditNote({
        invoiceId,
        kind,
        reason: reason.trim(),
        notes,
        totalHtCents: kind === "PARTIAL" ? eurosToCents(ht) : undefined,
        taxRateBps: invoice?.lines[0]?.taxRateBps ?? 2000,
      });
      const issued = await api.issueCreditNote(created.id);
      navigate(`/avoirs/${issued.id}`);
    } catch {
      setError("Impossible d’émettre l’avoir. Vérifiez le restant dû.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <Link to="/avoirs" className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Avoirs
      </Link>
      <div>
        <h1 className="font-serif text-3xl">Nouvel avoir</h1>
        <p className="mt-1 text-sm text-stone-500">Un avoir émis n’est jamais supprimé. Il diminue le restant dû de la facture.</p>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Facture d’origine</span>
          <select className={inputClass} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
            <option value="">Choisir</option>
            {invoices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.invoiceNumber} — {item.clientName} ({centsToEuroInput(item.amountDueCents)} € dus)
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Type</span>
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as CreditNoteKind)}>
            <option value="TOTAL">Total (restant dû)</option>
            <option value="PARTIAL">Partiel</option>
          </select>
        </label>
        {kind === "PARTIAL" ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Montant HT (€)</span>
            <input className={inputClass} inputMode="decimal" value={ht} onChange={(e) => setHt(e.target.value)} />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Motif</span>
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notes</span>
          <textarea className="min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {preview ? (
          <p className="text-sm text-stone-600">
            Avoir : {formatEur(preview.ht)} HT / {formatEur(preview.ttc)} TTC
          </p>
        ) : null}
      </section>

      <div className="flex justify-end gap-2">
        <Link to="/avoirs" className="inline-flex h-11 items-center px-4 text-sm font-medium text-stone-600">
          Annuler
        </Link>
        <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Émission…" : "Émettre l’avoir"}
        </button>
      </div>
    </form>
  );
}
