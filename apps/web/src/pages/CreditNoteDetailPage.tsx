import { formatDateFr, formatEur, CREDIT_NOTE_KIND_LABEL } from "@facturier/shared";
import type { CreditNote, MailLog } from "@facturier/shared";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MailJournal } from "../components/MailJournal";
import { SendMailDialog } from "../components/SendMailDialog";
import { CreditNoteStatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

export function CreditNoteDetailPage() {
  const { id } = useParams();
  const [note, setNote] = useState<CreditNote | null>(null);
  const [mails, setMails] = useState<MailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(currentId: string) {
    const [data, listed] = await Promise.all([
      api.getCreditNote(currentId),
      api.listMailLogs({ creditNoteId: currentId }),
    ]);
    setNote(data);
    setMails(listed);
  }

  useEffect(() => {
    if (!id) return;
    load(id).catch(() => setError("Avoir introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!note) return <p className="text-sm text-stone-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <Link to="/avoirs" className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Avoirs
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-800">{note.creditNumber ?? "Brouillon"}</p>
          <h1 className="font-serif text-3xl">{note.clientName}</h1>
          <div className="mt-2 flex gap-2">
            <CreditNoteStatusBadge status={note.status} />
            <span className="text-sm text-stone-500">{CREDIT_NOTE_KIND_LABEL[note.kind]}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void api.downloadPdf("credit-notes", note.id, `${note.creditNumber ?? "brouillon"}.pdf`)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
          <a
            href={api.pdfUrl("credit-notes", note.id)}
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
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Journal d’envoi</h2>
        <div className="mt-3">
          <MailJournal items={mails} />
        </div>
      </section>
      <SendMailDialog
        open={mailOpen}
        title={`Envoyer ${note.creditNumber ?? "l’avoir"}`}
        to={note.clientEmail}
        subject={`Avoir ${note.creditNumber ?? "brouillon"}`}
        message={`Bonjour,\n\nVeuillez trouver ci-joint l’avoir ${note.creditNumber ?? ""}.\n\nCordialement,\nAtelier Nord Lumière`}
        busy={busy}
        error={mailError}
        onClose={() => setMailOpen(false)}
        onSend={async (payload) => {
          setBusy(true);
          setMailError(null);
          try {
            await api.sendCreditNoteMail(note.id, payload);
            setMailOpen(false);
            await load(note.id);
          } catch {
            setMailError("Envoi impossible. Vérifiez l’adresse e-mail du client.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
