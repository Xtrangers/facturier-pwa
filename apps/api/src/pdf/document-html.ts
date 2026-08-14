import {
  formatDateFr,
  formatEur,
  formatQuantity,
  formatTaxRate,
  PRODUCT_UNIT_LABEL,
} from "@facturier/shared";
import type { ProductUnit } from "@facturier/shared";

export type PdfKind = "QUOTE" | "INVOICE" | "CREDIT_NOTE";

export type PdfLine = {
  designation: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  taxRateBps: number;
  lineHtCents: number;
  lineTaxCents: number;
};

export type PdfModel = {
  kind: PdfKind;
  number: string;
  draft: boolean;
  issueDate: string;
  extraDateLabel: string;
  extraDate: string;
  color: string;
  logoUrl: string;
  company: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    siret: string;
    vatNumber: string;
    iban: string;
    bic: string;
    paymentTerms: string;
  };
  client: {
    name: string;
    type: string;
    line1: string;
    line2: string;
    postalCode: string;
    city: string;
    country: string;
    siret: string;
    vatNumber: string;
  };
  lines: PdfLine[];
  travelFeeCents: number;
  travelFeeTaxRateBps: number;
  discountCents: number;
  linesHtCents: number;
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  depositCents: number;
  amountPaidCents: number;
  creditedCents: number;
  amountDueCents: number;
  notes: string;
  terms: string;
  legalMentions: string;
  termsAndConditions: string;
  reason: string;
  relatedNumber: string;
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unitLabel(unit: string) {
  return PRODUCT_UNIT_LABEL[unit as ProductUnit] ?? unit;
}

function title(kind: PdfKind) {
  if (kind === "QUOTE") return "Devis";
  if (kind === "CREDIT_NOTE") return "Avoir";
  return "Facture";
}

function defaultLegal(clientType: string) {
  const base =
    "En cas de retard de paiement, seront exigibles, conformément à l’article L. 441-10 du code de commerce, une indemnité calculée sur la base de trois fois le taux d’intérêt légal en vigueur.";
  if (clientType === "COMPANY") {
    return `${base} Indemnité forfaitaire pour frais de recouvrement : 40 €. Escompte pour paiement anticipé : néant.`;
  }
  return `${base} Escompte pour paiement anticipé : néant.`;
}

export function renderDocumentHtml(model: PdfModel) {
  const color = /^#[0-9A-Fa-f]{6}$/.test(model.color) ? model.color : "#0F766E";
  const vatRows = new Map<number, { ht: number; tax: number }>();
  for (const line of model.lines) {
    const current = vatRows.get(line.taxRateBps) ?? { ht: 0, tax: 0 };
    current.ht += line.lineHtCents;
    current.tax += line.lineTaxCents;
    vatRows.set(line.taxRateBps, current);
  }
  if (model.travelFeeCents > 0) {
    const tax = Math.round((model.travelFeeCents * model.travelFeeTaxRateBps) / 10_000);
    const current = vatRows.get(model.travelFeeTaxRateBps) ?? { ht: 0, tax: 0 };
    current.ht += model.travelFeeCents;
    current.tax += tax;
    vatRows.set(model.travelFeeTaxRateBps, current);
  }
  const legal = model.legalMentions.trim() || (model.kind === "INVOICE" ? defaultLegal(model.client.type) : "");
  const showForty =
    model.kind === "INVOICE" &&
    model.client.type === "COMPANY" &&
    !/40\s*€/.test(legal) &&
    !/40\s*euros/i.test(legal);

  const lineRows = model.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${esc(line.designation)}</strong>
            ${line.description ? `<div class="muted">${esc(line.description)}</div>` : ""}
          </td>
          <td class="num">${esc(formatQuantity(line.quantity))} ${esc(unitLabel(line.unit))}</td>
          <td class="num">${esc(formatEur(line.unitPriceCents))}</td>
          <td class="num">${esc(formatTaxRate(line.taxRateBps))}</td>
          <td class="num">${esc(formatEur(line.lineHtCents))}</td>
        </tr>`,
    )
    .join("");

  const vatTable = [...vatRows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([bps, row]) => `
        <tr>
          <td>${esc(formatTaxRate(bps))}</td>
          <td class="num">${esc(formatEur(row.ht))}</td>
          <td class="num">${esc(formatEur(row.tax))}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1c1917; margin: 0; font-size: 12px; }
    h1, h2 { font-weight: 500; margin: 0; }
    .muted { color: #78716c; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .brand { color: ${color}; }
    .badge { display: inline-block; border: 1px solid ${color}; color: ${color}; padding: 2px 8px; border-radius: 999px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
    .logo { max-height: 56px; max-width: 160px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #78716c; border-bottom: 1px solid #e7e5e4; padding: 8px 4px; }
    td { padding: 8px 4px; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { width: 280px; margin-left: auto; }
    .totals td { border: 0; padding: 4px 0; }
    .totals .grand { font-size: 16px; color: ${color}; border-top: 1px solid #e7e5e4; padding-top: 8px; }
    .footer { margin-top: 28px; font-size: 10px; color: #57534e; line-height: 1.45; }
    .draft { position: fixed; top: 40%; left: 10%; font-size: 72px; color: rgba(15,118,110,.12); transform: rotate(-24deg); pointer-events: none; }
  </style>
</head>
<body>
  ${model.draft ? `<div class="draft">BROUILLON</div>` : ""}
  <div class="row">
    <div>
      ${model.logoUrl ? `<img class="logo" src="${esc(model.logoUrl)}" alt="" />` : ""}
      <h1 class="brand">${esc(model.company.name)}</h1>
      <p>
        ${esc(model.company.addressLine1)}${model.company.addressLine2 ? `<br/>${esc(model.company.addressLine2)}` : ""}<br/>
        ${esc(model.company.postalCode)} ${esc(model.company.city)} ${esc(model.company.country)}<br/>
        ${model.company.phone ? `${esc(model.company.phone)}<br/>` : ""}
        ${model.company.email ? `${esc(model.company.email)}<br/>` : ""}
        ${model.company.siret ? `SIRET ${esc(model.company.siret)}<br/>` : ""}
        ${model.company.vatNumber ? `TVA ${esc(model.company.vatNumber)}` : ""}
      </p>
    </div>
    <div style="text-align:right">
      <div class="badge">${esc(title(model.kind))}</div>
      <h2 style="margin-top:8px">${esc(model.number)}</h2>
      <p>
        Date : ${esc(formatDateFr(model.issueDate))}<br/>
        ${esc(model.extraDateLabel)} : ${esc(formatDateFr(model.extraDate))}
      </p>
    </div>
  </div>

  <div class="row" style="margin-top:28px">
    <div>
      <div class="muted" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase">Client</div>
      <strong>${esc(model.client.name)}</strong>
      <p>
        ${esc(model.client.line1)}${model.client.line2 ? `<br/>${esc(model.client.line2)}` : ""}<br/>
        ${esc(model.client.postalCode)} ${esc(model.client.city)} ${esc(model.client.country)}
        ${model.client.siret ? `<br/>SIRET ${esc(model.client.siret)}` : ""}
        ${model.client.vatNumber ? `<br/>TVA ${esc(model.client.vatNumber)}` : ""}
      </p>
    </div>
    ${
      model.kind === "CREDIT_NOTE"
        ? `<div><div class="muted" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase">Facture d’origine</div><p>${esc(model.relatedNumber)}<br/>Motif : ${esc(model.reason)}</p></div>`
        : ""
    }
  </div>

  ${
    model.kind === "CREDIT_NOTE"
      ? ""
      : `<table style="margin-top:20px">
    <thead>
      <tr>
        <th>Désignation</th>
        <th class="num">Qté</th>
        <th class="num">P.U. HT</th>
        <th class="num">TVA</th>
        <th class="num">Total HT</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>`
  }

  <table class="totals" style="margin-top:16px">
    ${model.kind !== "CREDIT_NOTE" ? `<tr><td class="muted">Lignes HT</td><td class="num">${esc(formatEur(model.linesHtCents))}</td></tr>` : ""}
    ${model.travelFeeCents > 0 ? `<tr><td class="muted">Frais de déplacement</td><td class="num">${esc(formatEur(model.travelFeeCents))}</td></tr>` : ""}
    ${model.discountCents > 0 ? `<tr><td class="muted">Remise</td><td class="num">− ${esc(formatEur(model.discountCents))}</td></tr>` : ""}
    <tr><td class="muted">Total HT</td><td class="num">${esc(formatEur(model.totalHtCents))}</td></tr>
    <tr><td class="muted">TVA</td><td class="num">${esc(formatEur(model.totalTaxCents))}</td></tr>
    <tr><td class="grand">Total TTC</td><td class="num grand">${esc(formatEur(model.totalTtcCents))}</td></tr>
    ${model.depositCents > 0 ? `<tr><td class="muted">Acompte prévu</td><td class="num">${esc(formatEur(model.depositCents))}</td></tr>` : ""}
    ${model.kind === "INVOICE" && model.amountPaidCents > 0 ? `<tr><td class="muted">Déjà payé</td><td class="num">${esc(formatEur(model.amountPaidCents))}</td></tr>` : ""}
    ${model.kind === "INVOICE" && model.creditedCents > 0 ? `<tr><td class="muted">Avoirs</td><td class="num">${esc(formatEur(model.creditedCents))}</td></tr>` : ""}
    ${model.kind === "INVOICE" ? `<tr><td class="muted">Restant dû</td><td class="num">${esc(formatEur(model.amountDueCents))}</td></tr>` : ""}
  </table>

  ${
    vatTable
      ? `<h2 style="margin-top:24px;font-size:13px">Détail TVA</h2>
  <table style="width:320px">
    <thead><tr><th>Taux</th><th class="num">Base HT</th><th class="num">TVA</th></tr></thead>
    <tbody>${vatTable}</tbody>
  </table>`
      : ""
  }

  ${model.notes ? `<p style="margin-top:20px"><strong>Notes</strong><br/>${esc(model.notes).replace(/\n/g, "<br/>")}</p>` : ""}
  ${model.terms ? `<p><strong>Conditions particulières</strong><br/>${esc(model.terms).replace(/\n/g, "<br/>")}</p>` : ""}

  <div class="footer">
    ${
      model.kind === "INVOICE"
        ? `<p>${esc(model.company.paymentTerms)}${model.company.iban ? `<br/>IBAN ${esc(model.company.iban)}` : ""}${model.company.bic ? ` · BIC ${esc(model.company.bic)}` : ""}</p>`
        : ""
    }
    ${legal ? `<p>${esc(legal).replace(/\n/g, "<br/>")}</p>` : ""}
    ${showForty ? `<p>Indemnité forfaitaire pour frais de recouvrement due aux professionnels : 40 €.</p>` : ""}
    ${model.termsAndConditions ? `<p>${esc(model.termsAndConditions).replace(/\n/g, "<br/>")}</p>` : ""}
  </div>
</body>
</html>`;
}
