import { CLIENT_TYPE_LABEL, formatEur } from "@facturier/shared";
import type { Client } from "@facturier/shared";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p className="mt-1 text-sm text-stone-900">{value || "—"}</p>
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getClient(id)
      .then(setClient)
      .catch(() => setError("Client introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!client) return <p className="text-sm text-stone-500">Chargement…</p>;

  const shipping = client.shippingSameAsBilling ? client.billingAddress : client.shippingAddress;
  const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-800">{client.clientNumber}</p>
          <h1 className="font-serif text-3xl text-stone-900">{client.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={client.status} />
            <span className="text-sm text-stone-500">{CLIENT_TYPE_LABEL[client.type]}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const copy = await api.duplicateClient(client.id);
              navigate(`/clients/${copy.id}/modifier`);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium"
          >
            <Copy className="h-4 w-4" />
            Dupliquer
          </button>
          <Link
            to={`/clients/${client.id}/modifier`}
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="font-serif text-lg">Coordonnées</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="E-mail" value={client.email} />
            <Field label="Téléphone" value={client.phone} />
            <Field label="SIRET" value={client.siret} />
            <Field label="N° TVA" value={client.vatNumber} />
            <Field
              label="Adresse de facturation"
              value={`${client.billingAddress.line1}${client.billingAddress.line2 ? `, ${client.billingAddress.line2}` : ""}, ${client.billingAddress.postalCode} ${client.billingAddress.city}`}
            />
            <Field
              label="Adresse de livraison"
              value={
                client.shippingSameAsBilling
                  ? "Identique à la facturation"
                  : `${shipping.line1}, ${shipping.postalCode} ${shipping.city}`
              }
            />
          </div>
          {primary ? (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold">Contact principal</h3>
              <p className="mt-1 text-sm text-stone-700">
                {primary.firstName} {primary.lastName}
                {primary.role ? ` · ${primary.role}` : ""}
              </p>
              <p className="text-sm text-stone-500">
                {primary.email} {primary.phone ? `· ${primary.phone}` : ""}
              </p>
            </div>
          ) : null}
          {client.notes ? (
            <div className="mt-6 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold">Notes internes</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{client.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Solde client</p>
            <p className={`mt-2 font-serif text-3xl ${client.balanceCents > 0 ? "text-amber-800" : "text-stone-900"}`}>
              {formatEur(client.balanceCents)}
            </p>
            <p className="mt-1 text-xs text-stone-500">Recalculé à partir des factures et avoirs.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-lg">Devis et factures</h2>
            <div className="mt-3">
              <EmptyState title="Aucun document" description="L’historique apparaîtra dès la création des premiers devis et factures." />
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Supprimer ce client ?"
        message={`${client.name} sera archivé.`}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await api.deleteClient(client.id);
          navigate("/clients");
        }}
      />
    </div>
  );
}
