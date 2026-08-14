import { formatDateFr, formatEur, CREDIT_NOTE_KIND_LABEL } from "@facturier/shared";
import type { CreditNote } from "@facturier/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreditNoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

export function CreditNoteDetailPage() {
  const { id } = useParams();
  const [note, setNote] = useState<CreditNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getCreditNote(id).then(setNote).catch(() => setError("Avoir introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!note) return <p className="text-sm text-stone-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <Link to="/avoirs" className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Avoirs
      </Link>
      <div>
        <p className="text-xs font-semibold text-teal-800">{note.creditNumber ?? "Brouillon"}</p>
        <h1 className="font-serif text-3xl">{note.clientName}</h1>
        <div className="mt-2 flex gap-2">
          <CreditNoteStatusBadge status={note.status} />
          <span className="text-sm text-stone-500">{CREDIT_NOTE_KIND_LABEL[note.kind]}</span>
        </div>
      </div>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
        <p className="text-sm">
          Facture{" "}
          <Link to={`/factures/${note.invoiceId}`} className="font-medium text-teal-800 hover:underline">
            {note.invoiceNumber}
          </Link>
        </p>
        <p className="text-sm">Date : {formatDateFr(note.issueDate)}</p>
        <p className="text-sm">Motif : {note.reason}</p>
        {note.notes ? <p className="text-sm text-stone-600">{note.notes}</p> : null}
        <div className="border-t border-stone-100 pt-3">
          <p className="font-serif text-3xl text-teal-800">{formatEur(note.totalTtcCents)}</p>
          <p className="text-sm text-stone-500">{formatEur(note.totalHtCents)} HT</p>
        </div>
      </section>
    </div>
  );
}
