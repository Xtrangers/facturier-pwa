import { DEFAULT_TAX_RATE_OPTIONS, isValidSiret } from "@facturier/shared";
import type { CompanyProfile, CompanyProfilePayload } from "@facturier/shared";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

const textareaClass =
  "min-h-32 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

const empty: CompanyProfilePayload = {
  name: "",
  logoUrl: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "FR",
  phone: "",
  email: "",
  siret: "",
  vatNumber: "",
  paymentTerms: "Paiement à 30 jours",
  iban: "",
  bic: "",
  clientPrefix: "C",
  quotePrefix: "D",
  invoicePrefix: "F",
  creditPrefix: "A",
  defaultTaxRateBps: 2000,
  defaultDueDays: 30,
  pdfPrimaryColor: "#0F766E",
  legalMentions: "",
  termsAndConditions: "",
};

export function SettingsPage() {
  const [form, setForm] = useState<CompanyProfilePayload>(empty);
  const [preview, setPreview] = useState<Pick<
    CompanyProfile,
    "nextClientNumber" | "nextQuoteNumber" | "nextInvoiceNumber" | "nextCreditNumber"
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((profile) => {
        setForm({
          name: profile.name,
          logoUrl: profile.logoUrl,
          addressLine1: profile.addressLine1,
          addressLine2: profile.addressLine2,
          postalCode: profile.postalCode,
          city: profile.city,
          country: profile.country,
          phone: profile.phone,
          email: profile.email,
          siret: profile.siret,
          vatNumber: profile.vatNumber,
          paymentTerms: profile.paymentTerms,
          iban: profile.iban,
          bic: profile.bic,
          clientPrefix: profile.clientPrefix,
          quotePrefix: profile.quotePrefix,
          invoicePrefix: profile.invoicePrefix,
          creditPrefix: profile.creditPrefix,
          defaultTaxRateBps: profile.defaultTaxRateBps,
          defaultDueDays: profile.defaultDueDays,
          pdfPrimaryColor: profile.pdfPrimaryColor,
          legalMentions: profile.legalMentions,
          termsAndConditions: profile.termsAndConditions,
        });
        setPreview({
          nextClientNumber: profile.nextClientNumber,
          nextQuoteNumber: profile.nextQuoteNumber,
          nextInvoiceNumber: profile.nextInvoiceNumber,
          nextCreditNumber: profile.nextCreditNumber,
        });
      })
      .catch(() => setError("Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, []);

  function patch(update: Partial<CompanyProfilePayload>) {
    setForm((current) => ({ ...current, ...update }));
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!form.name.trim()) {
      setError("La raison sociale est obligatoire.");
      return;
    }
    if (!form.addressLine1.trim() || !form.postalCode.trim() || !form.city.trim()) {
      setError("L’adresse doit contenir la rue, le code postal et la ville.");
      return;
    }
    if (form.siret && !isValidSiret(form.siret)) {
      setError("Le SIRET doit contenir 14 chiffres.");
      return;
    }
    setSaving(true);
    try {
      const profile = await api.updateSettings(form);
      setPreview({
        nextClientNumber: profile.nextClientNumber,
        nextQuoteNumber: profile.nextQuoteNumber,
        nextInvoiceNumber: profile.nextInvoiceNumber,
        nextCreditNumber: profile.nextCreditNumber,
      });
      setSaved(true);
    } catch {
      setError("Enregistrement impossible. Vérifiez les champs et l’API.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Chargement…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Profil de l’entreprise, mentions légales et numérotation."
        actions={
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        }
      />

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Paramètres enregistrés.</p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Entreprise</h2>
        <Field label="Raison sociale">
          <input className={inputClass} value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail">
            <input type="email" className={inputClass} value={form.email ?? ""} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <input className={inputClass} value={form.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
          </Field>
          <Field label="SIRET">
            <input className={inputClass} value={form.siret ?? ""} onChange={(e) => patch({ siret: e.target.value })} />
          </Field>
          <Field label="N° TVA">
            <input className={inputClass} value={form.vatNumber ?? ""} onChange={(e) => patch({ vatNumber: e.target.value })} />
          </Field>
        </div>
        <Field label="Rue">
          <input className={inputClass} value={form.addressLine1} onChange={(e) => patch({ addressLine1: e.target.value })} required />
        </Field>
        <Field label="Complément">
          <input className={inputClass} value={form.addressLine2 ?? ""} onChange={(e) => patch({ addressLine2: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code postal">
            <input className={inputClass} value={form.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} required />
          </Field>
          <Field label="Ville">
            <input className={inputClass} value={form.city} onChange={(e) => patch({ city: e.target.value })} required />
          </Field>
          <Field label="Pays">
            <input className={inputClass} value={form.country ?? "FR"} onChange={(e) => patch({ country: e.target.value })} />
          </Field>
        </div>
        <Field label="URL du logo" hint="Téléversement de fichier plus tard, avec les PDF.">
          <input
            className={inputClass}
            value={form.logoUrl ?? ""}
            onChange={(e) => patch({ logoUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Paiement</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="IBAN">
            <input className={inputClass} value={form.iban ?? ""} onChange={(e) => patch({ iban: e.target.value })} />
          </Field>
          <Field label="BIC">
            <input className={inputClass} value={form.bic ?? ""} onChange={(e) => patch({ bic: e.target.value })} />
          </Field>
          <Field label="Conditions de paiement">
            <input
              className={inputClass}
              value={form.paymentTerms ?? ""}
              onChange={(e) => patch({ paymentTerms: e.target.value })}
            />
          </Field>
          <Field label="Délai par défaut (jours)">
            <input
              type="number"
              min={0}
              max={365}
              className={inputClass}
              value={form.defaultDueDays ?? 30}
              onChange={(e) => patch({ defaultDueDays: Number(e.target.value) })}
            />
          </Field>
          <Field label="TVA par défaut">
            <select
              className={inputClass}
              value={form.defaultTaxRateBps ?? 2000}
              onChange={(e) => patch({ defaultTaxRateBps: Number(e.target.value) })}
            >
              {DEFAULT_TAX_RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Couleur PDF">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-11 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
                value={form.pdfPrimaryColor ?? "#0F766E"}
                onChange={(e) => patch({ pdfPrimaryColor: e.target.value.toUpperCase() })}
              />
              <input
                className={inputClass}
                value={form.pdfPrimaryColor ?? "#0F766E"}
                onChange={(e) => patch({ pdfPrimaryColor: e.target.value.toUpperCase() })}
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Numérotation</h2>
        <p className="text-sm text-stone-500">
          Les préfixes s’appliquent aux prochains documents. Le prochain numéro est en lecture seule pour éviter un trou
          dans la séquence.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Préfixe clients">
            <input className={inputClass} value={form.clientPrefix ?? "C"} onChange={(e) => patch({ clientPrefix: e.target.value })} />
          </Field>
          <Field label="Prochain client" hint="Attribué à la création.">
            <input className={`${inputClass} bg-stone-50 text-stone-600`} value={preview?.nextClientNumber ?? "—"} readOnly />
          </Field>
          <Field label="Préfixe devis">
            <input className={inputClass} value={form.quotePrefix ?? "D"} onChange={(e) => patch({ quotePrefix: e.target.value })} />
          </Field>
          <Field label="Prochain devis">
            <input className={`${inputClass} bg-stone-50 text-stone-600`} value={preview?.nextQuoteNumber ?? "—"} readOnly />
          </Field>
          <Field label="Préfixe factures">
            <input className={inputClass} value={form.invoicePrefix ?? "F"} onChange={(e) => patch({ invoicePrefix: e.target.value })} />
          </Field>
          <Field label="Prochaine facture" hint="Attribué à l’émission uniquement.">
            <input className={`${inputClass} bg-stone-50 text-stone-600`} value={preview?.nextInvoiceNumber ?? "—"} readOnly />
          </Field>
          <Field label="Préfixe avoirs">
            <input className={inputClass} value={form.creditPrefix ?? "A"} onChange={(e) => patch({ creditPrefix: e.target.value })} />
          </Field>
          <Field label="Prochain avoir">
            <input className={`${inputClass} bg-stone-50 text-stone-600`} value={preview?.nextCreditNumber ?? "—"} readOnly />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-lg">Mentions légales</h2>
        <Field
          label="Mentions sur facture"
          hint="Pénalités de retard, indemnité 40 €, escompte… Figureront sur le PDF."
        >
          <textarea
            className={textareaClass}
            value={form.legalMentions ?? ""}
            onChange={(e) => patch({ legalMentions: e.target.value })}
            placeholder="En cas de retard de paiement, une indemnité égale à 3 fois le taux d’intérêt légal ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement seront exigibles. Escompte pour paiement anticipé : néant."
          />
        </Field>
        <Field label="Conditions générales" hint="CGV / conditions de devis. Notes internes exclues du PDF.">
          <textarea
            className={textareaClass}
            value={form.termsAndConditions ?? ""}
            onChange={(e) => patch({ termsAndConditions: e.target.value })}
          />
        </Field>
      </section>

      <div className="flex justify-end pb-8">
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
