import { formatDateFr, formatEur } from "@facturier/shared";
import type { Quote } from "@facturier/shared";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { QuoteStatusBadge } from "./StatusBadge";

type Props = {
  quote: Quote;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function QuoteCard({ quote, onDuplicate, onDelete }: Props) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/devis/${quote.id}`} className="min-w-0">
          <p className="text-xs font-medium text-teal-800">{quote.quoteNumber}</p>
          <h2 className="truncate font-semibold text-stone-900">{quote.clientName}</h2>
          <p className="text-sm text-stone-500">
            {formatDateFr(quote.issueDate)} · valable jusqu’au {formatDateFr(quote.validUntil)}
          </p>
        </Link>
        <QuoteStatusBadge status={quote.status} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <p className="text-sm font-semibold text-stone-800">{formatEur(quote.totalTtcCents)} TTC</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            onClick={() => onDuplicate(quote.id)}
            aria-label="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </button>
          {quote.status === "DRAFT" && onDelete ? (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => onDelete(quote.id)}
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <Link
            to={`/devis/${quote.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            aria-label="Ouvrir"
          >
            <MoreVertical className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
