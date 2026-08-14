import {
  formatDateFr,
  formatEur,
  formatQuantity,
  formatTaxRate,
  PRODUCT_UNIT_LABEL,
} from "@facturier/shared";
import type { Quote, QuoteStatus } from "@facturier/shared";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { QuoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

const NEXT_STATUS: Record<QuoteStatus, { status: QuoteStatus; label: string }[]> = {
  DRAFT: [{ status: "SENT", label: "Marquer comme envoyé" }],
  SENT: [
    { status: "PENDING", label: "En attente" },
    { status: "ACCEPTED", label: "Accepté" },
    { status: "REJECTED", label: "Refusé" },
    { status: "EXPIRED", label: "Expiré" },
  ],
  PENDING: [
    { status: "ACCEPTED", label: "Accepté" },
    { status: "REJECTED", label: "Refusé" },
    { status: "EXPIRED", label: "Expiré" },
  ],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

export function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getQuote(id)
      .then(setQuote)
      .catch(() => setError("Devis introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!quote) return <p className="text-sm text-stone-500">Chargement…</p>;

  const actions = NEXT_STATUS[quote.status];

  async function onStatus(next: QuoteStatus) {
    if (!quote) return;
    setBusy(true);
    setStatusError(null);
    try {
      const updated = await api.changeQuoteStatus(quote.id, next);
      setQuote(updated);
    } catch {
      setStatusError("Changement de statut impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/devis" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Devis
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-800">{quote.quoteNumber}</p>
          <h1 className="font-serif text-3xl text-stone-900">{quote.clientName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            <span className="text-sm text-stone-500">{quote.clientNumber}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const copy = await api.duplicateQuote(quote.id);
              navigate(`/devis/${copy.id}/modifier`);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Copy className="h-4 w-4" />
            Dupliquer
          </button>
          {quote.status === "DRAFT" ? (
            <>
              <Link
                to={`/devis/${quote.id}/modifier`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Link>
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </>
          ) : null}
        </div>
      </div>

      {statusError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{statusError}</p> : null}

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy}
              onClick={() => void onStatus(action.status)}
              className="inline-flex h-11 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {quote.status === "ACCEPTED" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <p className="flex-1">Devis accepté. Vous pouvez le transformer en facture brouillon.</p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const invoice = await api.createInvoiceFromQuote(quote.id);
                navigate(`/factures/${invoice.id}/modifier`);
              } catch {
                setStatusError("Conversion impossible.");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Convertir en facture
          </button>
        </div>
      ) : null}
      {quote.status === "CONVERTED" && quote.invoiceId ? (
        <p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Transformé en facture.{" "}
          <Link to={`/factures/${quote.invoiceId}`} className="font-semibold underline">
            Ouvrir la facture
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-lg">Lignes</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-stone-500 uppercase">
                  <tr>
                    <th className="pb-2 font-medium">Désignation</th>
                    <th className="pb-2 text-right font-medium">Qté</th>
                    <th className="pb-2 text-right font-medium">P.U. HT</th>
                    <th className="pb-2 text-right font-medium">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line) => (
                    <tr key={line.id} className="border-t border-stone-100">
                      <td className="py-3">
                        <p className="font-medium text-stone-900">{line.designation}</p>
                        <p className="text-xs text-stone-500">
                          {PRODUCT_UNIT_LABEL[line.unit]} · TVA {formatTaxRate(line.taxRateBps)}
                          {line.discountKind !== "NONE" ? " · remise" : ""}
                        </p>
                      </td>
                      <td className="py-3 text-right text-stone-600">{formatQuantity(line.quantity)}</td>
                      <td className="py-3 text-right text-stone-600">{formatEur(line.unitPriceCents)}</td>
                      <td className="py-3 text-right font-medium">{formatEur(line.lineHtCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {quote.notes || quote.terms || quote.internalNotes ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              {quote.notes ? (
                <div>
                  <h2 className="font-serif text-lg">Note client</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{quote.notes}</p>
                </div>
              ) : null}
              {quote.terms ? (
                <div className={quote.notes ? "mt-4 border-t border-stone-100 pt-4" : ""}>
                  <h3 className="text-sm font-semibold">Conditions particulières</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{quote.terms}</p>
                </div>
              ) : null}
              {quote.internalNotes ? (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <h3 className="text-sm font-semibold">Notes internes</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-500">{quote.internalNotes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Dates</p>
            <p className="mt-2 text-sm text-stone-800">Émis le {formatDateFr(quote.issueDate)}</p>
            <p className="text-sm text-stone-800">Valable jusqu’au {formatDateFr(quote.validUntil)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Lignes HT</span>
              <span>{formatEur(quote.linesHtCents)}</span>
            </div>
            {quote.travelFeeCents > 0 ? (
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-stone-500">Frais de déplacement</span>
                <span>{formatEur(quote.travelFeeCents)}</span>
              </div>
            ) : null}
            {quote.discountCents > 0 ? (
              <div className="mt-2 flex justify-between text-sm text-amber-800">
                <span>Remise</span>
                <span>− {formatEur(quote.discountCents)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-stone-500">Total HT</span>
              <span>{formatEur(quote.totalHtCents)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-stone-500">TVA</span>
              <span>{formatEur(quote.totalTaxCents)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-stone-100 pt-3">
              <span className="font-semibold">Total TTC</span>
              <span className="font-serif text-2xl text-teal-800">{formatEur(quote.totalTtcCents)}</span>
            </div>
            {quote.depositCents > 0 ? (
              <p className="mt-2 text-xs text-stone-500">Acompte prévu : {formatEur(quote.depositCents)}</p>
            ) : null}
          </div>
          <Link to={`/clients/${quote.clientId}`} className="block rounded-2xl border border-stone-200 bg-white p-5 hover:bg-stone-50">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Client</p>
            <p className="mt-1 font-semibold text-stone-900">{quote.clientName}</p>
            <p className="text-sm text-stone-500">{quote.clientNumber}</p>
          </Link>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Supprimer ce brouillon ?"
        message={`${quote.quoteNumber} sera archivé.`}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await api.deleteQuote(quote.id);
          navigate("/devis");
        }}
      />
    </div>
  );
}
