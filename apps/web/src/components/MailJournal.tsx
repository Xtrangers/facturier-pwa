import { MAIL_STATUS_LABEL } from "@facturier/shared";
import type { MailLog } from "@facturier/shared";

export function MailJournal({ items }: { items: MailLog[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-stone-500">Aucun envoi pour l’instant.</p>;
  }
  return (
    <ul className="divide-y divide-stone-100 text-sm">
      {items.map((item) => (
        <li key={item.id} className="py-2">
          <div className="flex justify-between gap-3">
            <span className="font-medium">{item.toEmail}</span>
            <span className={item.status === "FAILED" ? "text-red-700" : "text-emerald-800"}>
              {MAIL_STATUS_LABEL[item.status]}
              {item.transport === "file" ? " · fichier" : ""}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            {item.subject} · {new Date(item.createdAt).toLocaleString("fr-FR")}
          </p>
          {item.error ? <p className="text-xs text-red-700">{item.error}</p> : null}
        </li>
      ))}
    </ul>
  );
}
