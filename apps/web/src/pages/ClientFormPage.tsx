import { emptyAddress, isValidSiret } from "@facturier/shared";
import type { Address, ClientPayload, ClientStatus, ClientType } from "@facturier/shared";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

type FormState = ClientPayload;

const empty: FormState = {
  name: "",
  type: "COMPANY",
  status: "ACTIVE",
  billingAddress: emptyAddress(),
  shippingSameAsBilling: true,
  shippingAddress: emptyAddress(),
  phone: "",
  email: "",
  siret: "",
  vatNumber: "",
  notes: "",
  primaryContact: { firstName: "", lastName: "", role: "", email: "", phone: "" },
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

export function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getClient(id).then((client) => {
      const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];
      setForm({
        name: client.name,
        type: client.type,
        status: client.status,
        billingAddress: client.billingAddress,
        shippingSameAsBilling: client.shippingSameAsBilling,
        shippingAddress: client.shippingAddress,
        phone: client.phone,
        email: client.email,
        siret: client.siret,
        vatNumber: client.vatNumber,
        notes: client.notes,
        primaryContact: primary
          ? {
              firstName: primary.firstName,
              lastName: primary.lastName,
              role: primary.role,
              email: primary.email,
              phone: primary.phone,
            }
          : empty.primaryContact,
      });
    });
  }, [id]);

  function setBilling(patch: Partial<Address>) {
    setForm((f) => ({ ...f, billingAddress: { ...f.billingAddress, ...patch } }));
  }
  function setShipping(patch: Partial<Address>) {
    setForm((f) => ({ ...f, shippingAddress: { ...(f.shippingAddress ?? emptyAddress()), ...patch } }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Le nom ou la raison sociale est obligatoire.");
      return;
    }
    if (!form.billingAddress.line1 || !form.billingAddress.postalCode || !form.billingAddress.city) {
      setError("L’adresse de facturation doit contenir la rue, le code postal et la ville.");
      return;
    }
    if (form.type === "COMPANY" && form.siret && !isValidSiret(form.siret)) {
      setError("Le SIRET doit contenir 14 chiffres.");
      return;
    }
    const payload: ClientPayload = {
      ...form,
      name: form.name.trim(),
      primaryContact:
        form.primaryContact?.firstName || form.primaryContact?.lastName
          ? form.primaryContact
          : undefined,
    };
    setSaving(true);
    try {
      const saved = editing && id ? await api.updateClient(id, payload) : await api.createClient(payload);
      navigate(`/clients/${saved.id}`);
    } catch {
      setError("Enregistrement impossible. Vérifiez les champs et l’API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <Link to={id ? `/clients/${id}` : "/clients"} className="inline-flex items-center gap-2 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <h1 className="font-serif text-3xl">{editing ? "Modifier le client" : "Nouveau client"}</h1>
        <p className="mt-1 text-sm text-stone-500">Le numéro client est attribué automatiquement.</p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Identité</h2>
        <Field label="Nom ou raison sociale">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}
            >
              <option value="COMPANY">Entreprise</option>
              <option value="INDIVIDUAL">Particulier</option>
            </select>
          </Field>
          <Field label="Statut">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
            >
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="BLOCKED">Bloqué</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={form.type === "COMPANY" ? "SIRET" : "SIRET (facultatif)"}>
            <input className={inputClass} value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
          </Field>
          <Field label="N° TVA">
            <input className={inputClass} value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Adresse de facturation</h2>
        <Field label="Rue">
          <input className={inputClass} value={form.billingAddress.line1} onChange={(e) => setBilling({ line1: e.target.value })} required />
        </Field>
        <Field label="Complément">
          <input className={inputClass} value={form.billingAddress.line2 ?? ""} onChange={(e) => setBilling({ line2: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code postal">
            <input className={inputClass} value={form.billingAddress.postalCode} onChange={(e) => setBilling({ postalCode: e.target.value })} required />
          </Field>
          <Field label="Ville">
            <input className={inputClass} value={form.billingAddress.city} onChange={(e) => setBilling({ city: e.target.value })} required />
          </Field>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.shippingSameAsBilling}
            onChange={(e) => setForm({ ...form, shippingSameAsBilling: e.target.checked })}
          />
          Adresse de livraison identique à la facturation
        </label>
        {!form.shippingSameAsBilling ? (
          <div className="space-y-4 border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold">Adresse de livraison</h3>
            <Field label="Rue">
              <input className={inputClass} value={form.shippingAddress?.line1 ?? ""} onChange={(e) => setShipping({ line1: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code postal">
                <input className={inputClass} value={form.shippingAddress?.postalCode ?? ""} onChange={(e) => setShipping({ postalCode: e.target.value })} />
              </Field>
              <Field label="Ville">
                <input className={inputClass} value={form.shippingAddress?.city ?? ""} onChange={(e) => setShipping({ city: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Contact principal</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom">
            <input
              className={inputClass}
              value={form.primaryContact?.firstName ?? ""}
              onChange={(e) => setForm({ ...form, primaryContact: { ...form.primaryContact!, firstName: e.target.value } })}
            />
          </Field>
          <Field label="Nom">
            <input
              className={inputClass}
              value={form.primaryContact?.lastName ?? ""}
              onChange={(e) => setForm({ ...form, primaryContact: { ...form.primaryContact!, lastName: e.target.value } })}
            />
          </Field>
          <Field label="Fonction">
            <input
              className={inputClass}
              value={form.primaryContact?.role ?? ""}
              onChange={(e) => setForm({ ...form, primaryContact: { ...form.primaryContact!, role: e.target.value } })}
            />
          </Field>
          <Field label="E-mail du contact">
            <input
              type="email"
              className={inputClass}
              value={form.primaryContact?.email ?? ""}
              onChange={(e) => setForm({ ...form, primaryContact: { ...form.primaryContact!, email: e.target.value } })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Notes internes</h2>
        <textarea
          className="min-h-28 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-teal-700"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Ne figureront pas sur les PDF."
        />
      </section>

      <div className="flex justify-end gap-2 pb-8">
        <Link to={id ? `/clients/${id}` : "/clients"} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-stone-600">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
