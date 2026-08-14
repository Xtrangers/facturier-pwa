import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  to: string;
  subject: string;
  message: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSend: (payload: { to: string; subject: string; message: string }) => void;
};

export function SendMailDialog({ open, title, to, subject, message, busy, error, onClose, onSend }: Props) {
  const [form, setForm] = useState({ to, subject, message });
  useEffect(() => {
    if (open) setForm({ to, subject, message });
  }, [open, to, subject, message]);
  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    onSend(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-serif text-xl text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">Le PDF est joint automatiquement. Sans SMTP, l’e-mail est déposé dans le journal (fichier .eml).</p>
        {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Field label="Destinataire">
          <input
            type="email"
            required
            className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </Field>
        <Field label="Objet">
          <input
            className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </Field>
        <Field label="Message">
          <textarea
            className="min-h-28 w-full rounded-xl border border-stone-200 p-3 text-sm"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-medium text-stone-600">
            Annuler
          </button>
          <button type="submit" disabled={busy} className="h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
