import { formatEur } from "@facturier/shared";
import { CLIENT_TYPE_LABEL } from "@facturier/shared";
import type { Client } from "@facturier/shared";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";

type Props = {
  client: Client;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ClientCard({ client, onDuplicate, onDelete }: Props) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/clients/${client.id}`} className="min-w-0">
          <p className="text-xs font-medium text-teal-800">{client.clientNumber}</p>
          <h2 className="truncate font-semibold text-stone-900">{client.name}</h2>
          <p className="text-sm text-stone-500">{CLIENT_TYPE_LABEL[client.type]} · {client.billingAddress.city}</p>
        </Link>
        <StatusBadge status={client.status} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <p className={`text-sm font-semibold ${client.balanceCents > 0 ? "text-amber-700" : "text-stone-700"}`}>
          {formatEur(client.balanceCents)}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
            onClick={() => onDuplicate(client.id)}
            aria-label="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDelete(client.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Link
            to={`/clients/${client.id}`}
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
