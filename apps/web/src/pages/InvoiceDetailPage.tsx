import {
  centsToEuroInput,
  eurosToCents,
  formatDateFr,
  formatEur,
  formatQuantity,
  formatTaxRate,
  PAYMENT_METHOD_LABEL,
  PRODUCT_UNIT_LABEL,
} from "@facturier/shared";
import type { CreditNote, Invoice, MailLog, Payment, PaymentMethod } from "@facturier/shared";
import { ArrowLeft, Copy, Download, Mail, Pencil, Printer, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MailJournal } from "../components/MailJournal";
import { SendMailDialog } from "../components/SendMailDialog";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [mails, setMails] = useState<MailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
  const [reference, setReference] = useState("");

  async function load(currentId: string) {
    const data = await api.getInvoice(currentId);
    setInvoice(data);
    setAmount(centsToEuroInput(data.amountDueCents));
    const [listed, credits, journal] = await Promise.all([
      api.listInvoicePayments(currentId),
      api.listCreditNotes({ invoiceId: currentId }),
      api.listMailLogs({ invoiceId: currentId }),
    ]);
    setPayments(listed);
    setCreditNotes(credits.items);
    setMails(journal);
  }

  useEffect(() => {
    if (!id) return;
    load(id).catch(() => setError("Facture introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!invoice) return <p className="text-sm text-stone-500">Chargement…</p>;

  async function onIssue() {
    setBusy(true);
    try {
      const updated = await api.issueInvoice(invoice.id);
      setInvoice(updated);
    } catch {
      setError("Émission impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.addInvoicePayment(invoice.id, {
        amountCents: eurosToCents(amount),
        method,
        reference,
      });
      setInvoice(updated);
      setPayments(await api.listInvoicePayments(invoice.id));
    } catch {
      setError("Paiement refusé. Vérifiez le montant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/factures" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Factures
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-800">{invoice.invoiceNumber ?? "Brouillon"}</p>
          <h1 className="font-serif text-3xl text-stone-900">{invoice.clientName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.quoteNumber ? (
              <Link to={`/devis/${invoice.quoteId}`} className="text-sm text-teal-800 hover:underline">
                Devis {invoice.quoteNumber}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void api.downloadPdf("invoices", invoice.id, `${invoice.invoiceNumber ?? "brouillon"}.pdf`)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
          <a
            href={api.pdfUrl("invoices", invoice.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </a>
          <button
            type="button"
            onClick={() => {
              setMailError(null);
              setMailOpen(true);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Mail className="h-4 w-4" />
            Envoyer
          </button>
          <button
            type="button"
            onClick={async () => {
              const copy = await api.duplicateInvoice(invoice.id);
              navigate(`/factures/${copy.id}/modifier`);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Copy className="h-4 w-4" />
            Dupliquer
          </button>
          {invoice.status === "DRAFT" ? (
            <>
              <Link to={`/factures/${invoice.id}/modifier`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium">
                <Pencil className="h-4 w-4" />
                Modifier
              </Link>
              <button type="button" disabled={busy} onClick={() => void onIssue()} className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60">
                Émettre
              </button>
              <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </>
          ) : null}
          {invoice.status === "ISSUED" ? (
            <button type="button" disabled={busy} onClick={() => void api.changeInvoiceStatus(invoice.id, "SENT").then(setInvoice)} className="inline-flex h-11 items-center rounded-xl border border-stone-200 px-4 text-sm font-medium">
              Marquer envoyée
            </button>
          ) : null}
          {invoice.status !== "DRAFT" && invoice.amountDueCents > 0 ? (
            <Link to={`/avoirs/nouveau?facture=${invoice.id}`} className="inline-flex h-11 items-center rounded-xl border border-stone-200 px-4 text-sm font-medium">
              Créer un avoir
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-lg">Lignes</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="pb-2 font-medium">Désignation</th>
                  <th className="pb-2 text-right font-medium">Qté</th>
                  <th className="pb-2 text-right font-medium">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-t border-stone-100">
                    <td className="py-3">
                      <p className="font-medium">{line.designation}</p>
                      <p className="text-xs text-stone-500">
                        {PRODUCT_UNIT_LABEL[line.unit]} · TVA {formatTaxRate(line.taxRateBps)}
                      </p>
                    </td>
                    <td className="py-3 text-right">{formatQuantity(line.quantity)}</td>
                    <td className="py-3 text-right font-medium">{formatEur(line.lineHtCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invoice.status !== "DRAFT" ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg">Paiements</h2>
                <Link to={`/paiements?facture=${invoice.id}`} className="text-sm font-medium text-teal-800 hover:underline">
                  Tous les paiements
                </Link>
              </div>
              {invoice.amountDueCents > 0 ? (
                <form onSubmit={onPay} className="mt-4 grid gap-3 sm:grid-cols-4">
                  <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Montant" />
                  <select className="h-11 rounded-xl border border-stone-200 px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((key) => (
                      <option key={key} value={key}>
                        {PAYMENT_METHOD_LABEL[key]}
                      </option>
                    ))}
                  </select>
                  <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm" placeholder="Référence" value={reference} onChange={(e) => setReference(e.target.value)} />
                  <button type="submit" disabled={busy} className="h-11 rounded-xl bg-teal-800 text-sm font-semibold text-white disabled:opacity-60">
                    Enregistrer
                  </button>
                </form>
              ) : null}
              <ul className="mt-4 space-y-2 text-sm">
                {payments.length === 0 ? <li className="text-stone-500">Aucun paiement.</li> : null}
                {payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between border-t border-stone-100 py-2">
                    <span>
                      {formatDateFr(payment.paidAt)} · {PAYMENT_METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                    <span className="font-medium">{formatEur(payment.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {creditNotes.length > 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="font-serif text-lg">Avoirs</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {creditNotes.map((note) => (
                  <li key={note.id}>
                    <Link to={`/avoirs/${note.id}`} className="flex justify-between border-t border-stone-100 py-2 hover:underline">
                      <span>
                        {note.creditNumber ?? "Brouillon"} · {note.reason}
                      </span>
                      <span className="font-medium">{formatEur(note.totalTtcCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Dates</p>
            <p className="mt-2 text-sm">Émise le {formatDateFr(invoice.issueDate)}</p>
            <p className="text-sm">Échéance {formatDateFr(invoice.dueDate)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Total HT</span><span>{formatEur(invoice.totalHtCents)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">TVA</span><span>{formatEur(invoice.totalTaxCents)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Total TTC</span><span>{formatEur(invoice.totalTtcCents)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Payé</span><span>{formatEur(invoice.amountPaidCents)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Avoirs</span><span>{formatEur(invoice.creditedCents)}</span></div>
            <div className="flex justify-between border-t border-stone-100 pt-3">
              <span className="font-semibold">Restant dû</span>
              <span className="font-serif text-2xl text-amber-800">{formatEur(invoice.amountDueCents)}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-lg">Journal d’envoi</h2>
            <div className="mt-3">
              <MailJournal items={mails} />
            </div>
          </div>
        </section>
      </div>

      <SendMailDialog
        open={mailOpen}
        title={`Envoyer ${invoice.invoiceNumber ?? "le brouillon"}`}
        to={invoice.clientEmail}
        subject={`Facture ${invoice.invoiceNumber ?? "brouillon"}`}
        message={`Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoice.invoiceNumber ?? ""}.\n\nCordialement,\nAtelier Nord Lumière`}
        busy={busy}
        error={mailError}
        onClose={() => setMailOpen(false)}
        onSend={async (payload) => {
          setBusy(true);
          setMailError(null);
          try {
            await api.sendInvoiceMail(invoice.id, payload);
            setMailOpen(false);
            await load(invoice.id);
          } catch {
            setMailError("Envoi impossible. Vérifiez l’adresse e-mail du client.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <ConfirmDialog
        open={confirm}
        title="Supprimer ce brouillon ?"
        message="La facture brouillon sera archivée."
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await api.deleteInvoice(invoice.id);
          navigate("/factures");
        }}
      />
    </div>
  );
}
