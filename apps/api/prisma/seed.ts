import { PrismaClient } from "@prisma/client";
import { computeQuoteTotals } from "@facturier/shared";
import type { DiscountKind } from "@facturier/shared";

const prisma = new PrismaClient();

const PRODUCT_CATEGORIES = ["Éclairage", "Consommables", "Prestations"] as const;

const PRODUCTS = [
  {
    sku: "SUS-LAIT-40",
    name: "Suspension laiton 40 cm",
    description: "Suspension en laiton brossé, abat-jour verre opale. Idéale entrée et salle à manger.",
    category: "Éclairage",
    type: "MATERIAL",
    unit: "PIECE",
    purchasePriceCents: 8900,
    salePriceHtCents: 18900,
    taxRateBps: 2000,
    stockQty: 6,
    barcode: "3760123450001",
    status: "ACTIVE",
  },
  {
    sku: "SUS-LIN-60",
    name: "Suspension lin 60 cm",
    description: "Abat-jour lin naturel, montage E27. Fin de série.",
    category: "Éclairage",
    type: "MATERIAL",
    unit: "PIECE",
    purchasePriceCents: 6200,
    salePriceHtCents: 14500,
    taxRateBps: 2000,
    stockQty: 2,
    barcode: "",
    status: "ARCHIVED",
  },
  {
    sku: "APPL-NICK-24",
    name: "Applique murale nickel",
    description: "Applique orientable nickel satiné, ampoule non fournie.",
    category: "Éclairage",
    type: "MATERIAL",
    unit: "PIECE",
    purchasePriceCents: 4200,
    salePriceHtCents: 9800,
    taxRateBps: 2000,
    stockQty: 12,
    barcode: "3760123450002",
    status: "ACTIVE",
  },
  {
    sku: "AMP-LED-E27",
    name: "Ampoule LED E27 8 W",
    description: "Blanc chaud 2700 K, équivalent 60 W, dimmable.",
    category: "Consommables",
    type: "MATERIAL",
    unit: "PIECE",
    purchasePriceCents: 280,
    salePriceHtCents: 890,
    taxRateBps: 2000,
    stockQty: 48,
    barcode: "3760123450003",
    status: "ACTIVE",
  },
  {
    sku: "CBL-TEXT-M",
    name: "Câble textile au mètre",
    description: "Câble textile 2×0,75 mm², coloris ivoire. Vendu au mètre.",
    category: "Consommables",
    type: "MATERIAL",
    unit: "METER",
    purchasePriceCents: 180,
    salePriceHtCents: 450,
    taxRateBps: 2000,
    stockQty: 80,
    barcode: "",
    status: "ACTIVE",
  },
  {
    sku: "POSE-LUM",
    name: "Pose de luminaire",
    description: "Installation d’un luminaire existant, hors création de circuit.",
    category: "Prestations",
    type: "LABOR",
    unit: "HOUR",
    purchasePriceCents: 0,
    salePriceHtCents: 6500,
    taxRateBps: 2000,
    stockQty: null,
    barcode: "",
    status: "ACTIVE",
  },
  {
    sku: "ETUDE-LUM",
    name: "Étude d’éclairage",
    description: "Relevé, plan d’implantation et préconisations pour une pièce ou un hall.",
    category: "Prestations",
    type: "SERVICE",
    unit: "FLAT",
    purchasePriceCents: 0,
    salePriceHtCents: 25000,
    taxRateBps: 2000,
    stockQty: null,
    barcode: "",
    status: "ACTIVE",
  },
  {
    sku: "DEPL-LILLE",
    name: "Frais de déplacement — métropole lilloise",
    description: "Forfait aller-retour dans un rayon de 30 km autour de Lille.",
    category: "Prestations",
    type: "TRAVEL",
    unit: "FLAT",
    purchasePriceCents: 0,
    salePriceHtCents: 4500,
    taxRateBps: 2000,
    stockQty: null,
    barcode: "",
    status: "ACTIVE",
  },
];

async function seedProducts(companyId: string) {
  const existingCount = await prisma.product.count({ where: { companyId } });
  if (existingCount > 0) {
    console.log("Tarifs déjà présents, seed produits ignoré.");
    return;
  }

  const categoryIds = new Map<string, string>();
  for (const name of PRODUCT_CATEGORIES) {
    const category = await prisma.productCategory.create({
      data: { companyId, name },
    });
    categoryIds.set(name, category.id);
  }

  for (const row of PRODUCTS) {
    const { category, ...data } = row;
    await prisma.product.create({
      data: {
        ...data,
        companyId,
        categoryId: categoryIds.get(category) ?? null,
      },
    });
  }

  await prisma.companySettings.update({
    where: { companyId },
    data: { nextProductSeq: 9 },
  });

  console.log("Seed tarifs OK — 8 articles");
}

async function seedQuotes(companyId: string) {
  const existingCount = await prisma.quote.count({ where: { companyId } });
  if (existingCount > 0) {
    console.log("Devis déjà présents, seed devis ignoré.");
    return;
  }

  const client = async (clientNumber: string) => {
    const row = await prisma.client.findFirst({ where: { companyId, clientNumber } });
    if (!row) throw new Error(`Client ${clientNumber} manquant pour le seed devis`);
    return row;
  };
  const product = async (sku: string) => {
    const row = await prisma.product.findFirst({ where: { companyId, sku } });
    if (!row) throw new Error(`Article ${sku} manquant pour le seed devis`);
    return row;
  };

  const verre = await client("C-00001");
  const hotel = await client("C-00002");
  const sophie = await client("C-00003");
  const sus = await product("SUS-LAIT-40");
  const amp = await product("AMP-LED-E27");
  const pose = await product("POSE-LUM");
  const appl = await product("APPL-NICK-24");
  const etude = await product("ETUDE-LUM");

  type SeedLine = {
    productId: string;
    designation: string;
    description: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    discountKind: DiscountKind;
    discountValue: number;
    taxRateBps: number;
  };

  async function createQuote(params: {
    clientId: string;
    quoteNumber: string;
    status: string;
    issueDate: Date;
    validUntil: Date;
    notes: string;
    terms: string;
    discountKind: DiscountKind;
    discountValue: number;
    travelFeeCents: number;
    depositCents: number;
    lines: SeedLine[];
  }) {
    const computed = computeQuoteTotals({
      lines: params.lines,
      travelFeeCents: params.travelFeeCents,
      travelFeeTaxRateBps: 2000,
      discountKind: params.discountKind,
      discountValue: params.discountValue,
    });
    await prisma.quote.create({
      data: {
        companyId,
        clientId: params.clientId,
        quoteNumber: params.quoteNumber,
        status: params.status,
        issueDate: params.issueDate,
        validUntil: params.validUntil,
        notes: params.notes,
        terms: params.terms,
        discountKind: params.discountKind,
        discountValue: params.discountValue,
        travelFeeCents: params.travelFeeCents,
        travelFeeTaxRateBps: 2000,
        depositCents: params.depositCents,
        linesHtCents: computed.linesHtCents,
        discountCents: computed.discountCents,
        totalHtCents: computed.totalHtCents,
        totalTaxCents: computed.totalTaxCents,
        totalTtcCents: computed.totalTtcCents,
        lines: {
          create: params.lines.map((line, index) => ({
            productId: line.productId,
            position: index,
            designation: line.designation,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPriceCents: line.unitPriceCents,
            discountKind: line.discountKind,
            discountValue: line.discountValue,
            taxRateBps: line.taxRateBps,
            lineHtCents: computed.lines[index].lineHtCents,
            lineTaxCents: computed.lines[index].lineTaxCents,
            lineTtcCents: computed.lines[index].lineTtcCents,
          })),
        },
      },
    });
  }

  await createQuote({
    clientId: verre.id,
    quoteNumber: "D-2026-00001",
    status: "DRAFT",
    issueDate: new Date("2026-08-04T12:00:00.000Z"),
    validUntil: new Date("2026-09-03T12:00:00.000Z"),
    notes: "Remplacement des suspensions du showroom.",
    terms: "Devis valable 30 jours. Acompte de 30 % à la commande.",
    discountKind: "PERCENT",
    discountValue: 5,
    travelFeeCents: 4500,
    depositCents: 0,
    lines: [
      {
        productId: sus.id,
        designation: sus.name,
        description: sus.description,
        quantity: 2,
        unit: sus.unit,
        unitPriceCents: sus.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: sus.taxRateBps,
      },
      {
        productId: amp.id,
        designation: amp.name,
        description: amp.description,
        quantity: 2,
        unit: amp.unit,
        unitPriceCents: amp.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: amp.taxRateBps,
      },
      {
        productId: pose.id,
        designation: pose.name,
        description: pose.description,
        quantity: 3,
        unit: pose.unit,
        unitPriceCents: pose.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: pose.taxRateBps,
      },
    ],
  });

  await createQuote({
    clientId: hotel.id,
    quoteNumber: "D-2026-00002",
    status: "SENT",
    issueDate: new Date("2026-07-22T12:00:00.000Z"),
    validUntil: new Date("2026-08-21T12:00:00.000Z"),
    notes: "Hall d’entrée — étude + pose des appliques.",
    terms: "Pose hors création de circuit électrique.",
    discountKind: "NONE",
    discountValue: 0,
    travelFeeCents: 4500,
    depositCents: 0,
    lines: [
      {
        productId: etude.id,
        designation: etude.name,
        description: etude.description,
        quantity: 1,
        unit: etude.unit,
        unitPriceCents: etude.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: etude.taxRateBps,
      },
      {
        productId: appl.id,
        designation: appl.name,
        description: appl.description,
        quantity: 4,
        unit: appl.unit,
        unitPriceCents: appl.salePriceHtCents,
        discountKind: "PERCENT",
        discountValue: 10,
        taxRateBps: appl.taxRateBps,
      },
      {
        productId: pose.id,
        designation: pose.name,
        description: pose.description,
        quantity: 8,
        unit: pose.unit,
        unitPriceCents: pose.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: pose.taxRateBps,
      },
    ],
  });

  await createQuote({
    clientId: sophie.id,
    quoteNumber: "D-2026-00003",
    status: "ACCEPTED",
    issueDate: new Date("2026-07-10T12:00:00.000Z"),
    validUntil: new Date("2026-08-09T12:00:00.000Z"),
    notes: "Suspension cuisine + pose.",
    terms: "",
    discountKind: "NONE",
    discountValue: 0,
    travelFeeCents: 0,
    depositCents: 20000,
    lines: [
      {
        productId: sus.id,
        designation: sus.name,
        description: sus.description,
        quantity: 1,
        unit: sus.unit,
        unitPriceCents: sus.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: sus.taxRateBps,
      },
      {
        productId: pose.id,
        designation: pose.name,
        description: pose.description,
        quantity: 2,
        unit: pose.unit,
        unitPriceCents: pose.salePriceHtCents,
        discountKind: "NONE",
        discountValue: 0,
        taxRateBps: pose.taxRateBps,
      },
    ],
  });

  await prisma.companySettings.update({
    where: { companyId },
    data: { nextQuoteSeq: 4 },
  });

  console.log("Seed devis OK — 3 devis");
}

async function ensureConvertibleQuote(companyId: string) {
  const convertible = await prisma.quote.findFirst({
    where: { companyId, deletedAt: null, status: "ACCEPTED", invoices: { none: { deletedAt: null } } },
  });
  if (convertible) return;

  const candidates = ["D-2026-00004", "D-2026-00005", "D-2026-00006"];
  let quoteNumber: string | null = null;
  for (const candidate of candidates) {
    const row = await prisma.quote.findFirst({ where: { companyId, quoteNumber: candidate } });
    if (!row) {
      quoteNumber = candidate;
      break;
    }
  }
  if (!quoteNumber) return;

  const client = await prisma.client.findFirst({ where: { companyId, clientNumber: "C-00004" } });
  const pose = await prisma.product.findFirst({ where: { companyId, sku: "POSE-LUM" } });
  if (!client || !pose) return;

  const lines = [
    {
      quantity: 2,
      unitPriceCents: pose.salePriceHtCents,
      discountKind: "NONE" as const,
      discountValue: 0,
      taxRateBps: pose.taxRateBps,
    },
  ];
  const computed = computeQuoteTotals({
    lines,
    travelFeeCents: 0,
    travelFeeTaxRateBps: 2000,
    discountKind: "NONE",
    discountValue: 0,
  });

  await prisma.quote.create({
    data: {
      companyId,
      clientId: client.id,
      quoteNumber,
      status: "ACCEPTED",
      issueDate: new Date("2026-08-08T12:00:00.000Z"),
      validUntil: new Date("2026-09-07T12:00:00.000Z"),
      notes: "Pose complémentaire — devis accepté, prêt à facturer.",
      terms: "",
      discountKind: "NONE",
      discountValue: 0,
      linesHtCents: computed.linesHtCents,
      discountCents: computed.discountCents,
      totalHtCents: computed.totalHtCents,
      totalTaxCents: computed.totalTaxCents,
      totalTtcCents: computed.totalTtcCents,
      lines: {
        create: [
          {
            productId: pose.id,
            position: 0,
            designation: pose.name,
            description: pose.description,
            quantity: 2,
            unit: pose.unit,
            unitPriceCents: pose.salePriceHtCents,
            discountKind: "NONE",
            discountValue: 0,
            taxRateBps: pose.taxRateBps,
            lineHtCents: computed.lines[0].lineHtCents,
            lineTaxCents: computed.lines[0].lineTaxCents,
            lineTtcCents: computed.lines[0].lineTtcCents,
          },
        ],
      },
    },
  });

  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  const nextSeq = Number(quoteNumber.slice(-5)) + 1;
  if (settings && settings.nextQuoteSeq < nextSeq) {
    await prisma.companySettings.update({ where: { companyId }, data: { nextQuoteSeq: nextSeq } });
  }
  console.log(`Seed devis convertible OK — ${quoteNumber}`);
}

async function seedBilling(companyId: string) {
  const existingCount = await prisma.invoice.count({ where: { companyId } });
  if (existingCount > 0) {
    console.log("Factures déjà présentes, seed facturation ignoré.");
    return;
  }

  const client = async (clientNumber: string) => {
    const row = await prisma.client.findFirst({ where: { companyId, clientNumber } });
    if (!row) throw new Error(`Client ${clientNumber} manquant`);
    return row;
  };
  const product = async (sku: string) => {
    const row = await prisma.product.findFirst({ where: { companyId, sku } });
    if (!row) throw new Error(`Article ${sku} manquant`);
    return row;
  };

  const verre = await client("C-00001");
  const sophie = await client("C-00003");
  const marc = await client("C-00006");
  const sus = await product("SUS-LAIT-40");
  const pose = await product("POSE-LUM");
  const sophieQuote = await prisma.quote.findFirst({ where: { companyId, quoteNumber: "D-2026-00003" } });

  function totals(lines: { quantity: number; unitPriceCents: number; taxRateBps: number }[], travel = 0) {
    return computeQuoteTotals({
      lines: lines.map((line) => ({
        ...line,
        discountKind: "NONE" as const,
        discountValue: 0,
      })),
      travelFeeCents: travel,
      travelFeeTaxRateBps: 2000,
      discountKind: "NONE",
      discountValue: 0,
    });
  }

  const overdueLines = [
    {
      productId: pose.id,
      designation: pose.name,
      description: pose.description,
      quantity: 4,
      unit: pose.unit,
      unitPriceCents: pose.salePriceHtCents,
      discountKind: "NONE",
      discountValue: 0,
      taxRateBps: pose.taxRateBps,
    },
  ];
  const overdueTotals = totals(overdueLines);
  const overdue = await prisma.invoice.create({
    data: {
      companyId,
      clientId: marc.id,
      invoiceNumber: "F-2026-00001",
      status: "OVERDUE",
      issueDate: new Date("2026-06-01T12:00:00.000Z"),
      dueDate: new Date("2026-07-01T12:00:00.000Z"),
      notes: "Pose luminaires — relance en cours.",
      totalHtCents: overdueTotals.totalHtCents,
      totalTaxCents: overdueTotals.totalTaxCents,
      totalTtcCents: overdueTotals.totalTtcCents,
      linesHtCents: overdueTotals.linesHtCents,
      amountDueCents: overdueTotals.totalTtcCents,
      lines: {
        create: overdueLines.map((line, index) => ({
          ...line,
          position: index,
          lineHtCents: overdueTotals.lines[index].lineHtCents,
          lineTaxCents: overdueTotals.lines[index].lineTaxCents,
          lineTtcCents: overdueTotals.lines[index].lineTtcCents,
        })),
      },
    },
  });

  await prisma.reminder.create({
    data: {
      companyId,
      target: "INVOICE",
      invoiceId: overdue.id,
      level: 1,
      notes: "1re relance — facture F-2026-00001",
    },
  });

  const verreLines = [
    {
      productId: sus.id,
      designation: sus.name,
      description: sus.description,
      quantity: 2,
      unit: sus.unit,
      unitPriceCents: sus.salePriceHtCents,
      discountKind: "NONE",
      discountValue: 0,
      taxRateBps: sus.taxRateBps,
    },
  ];
  const verreTotals = totals(verreLines, 4500);
  const verreInvoice = await prisma.invoice.create({
    data: {
      companyId,
      clientId: verre.id,
      invoiceNumber: "F-2026-00002",
      status: "PARTIAL",
      issueDate: new Date("2026-07-15T12:00:00.000Z"),
      dueDate: new Date("2026-08-14T12:00:00.000Z"),
      travelFeeCents: 4500,
      linesHtCents: verreTotals.linesHtCents,
      totalHtCents: verreTotals.totalHtCents,
      totalTaxCents: verreTotals.totalTaxCents,
      totalTtcCents: verreTotals.totalTtcCents,
      amountPaidCents: 20000,
      amountDueCents: verreTotals.totalTtcCents - 20000,
      lines: {
        create: verreLines.map((line, index) => ({
          ...line,
          position: index,
          lineHtCents: verreTotals.lines[index].lineHtCents,
          lineTaxCents: verreTotals.lines[index].lineTaxCents,
          lineTtcCents: verreTotals.lines[index].lineTtcCents,
        })),
      },
    },
  });
  await prisma.payment.create({
    data: {
      companyId,
      invoiceId: verreInvoice.id,
      amountCents: 20000,
      method: "TRANSFER",
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
      reference: "VIR-2026-0720",
    },
  });

  const sophieLines = [
    {
      productId: sus.id,
      designation: sus.name,
      description: sus.description,
      quantity: 1,
      unit: sus.unit,
      unitPriceCents: sus.salePriceHtCents,
      discountKind: "NONE",
      discountValue: 0,
      taxRateBps: sus.taxRateBps,
    },
    {
      productId: pose.id,
      designation: pose.name,
      description: pose.description,
      quantity: 2,
      unit: pose.unit,
      unitPriceCents: pose.salePriceHtCents,
      discountKind: "NONE",
      discountValue: 0,
      taxRateBps: pose.taxRateBps,
    },
  ];
  const sophieTotals = totals(sophieLines);
  const sophieInvoice = await prisma.invoice.create({
    data: {
      companyId,
      clientId: sophie.id,
      quoteId: sophieQuote?.id ?? null,
      invoiceNumber: "F-2026-00003",
      status: "PAID",
      issueDate: new Date("2026-07-12T12:00:00.000Z"),
      dueDate: new Date("2026-08-11T12:00:00.000Z"),
      depositCents: 20000,
      linesHtCents: sophieTotals.linesHtCents,
      totalHtCents: sophieTotals.totalHtCents,
      totalTaxCents: sophieTotals.totalTaxCents,
      totalTtcCents: sophieTotals.totalTtcCents,
      amountPaidCents: sophieTotals.totalTtcCents,
      amountDueCents: 0,
      lines: {
        create: sophieLines.map((line, index) => ({
          ...line,
          position: index,
          lineHtCents: sophieTotals.lines[index].lineHtCents,
          lineTaxCents: sophieTotals.lines[index].lineTaxCents,
          lineTtcCents: sophieTotals.lines[index].lineTtcCents,
        })),
      },
    },
  });
  await prisma.payment.create({
    data: {
      companyId,
      invoiceId: sophieInvoice.id,
      amountCents: sophieTotals.totalTtcCents,
      method: "CARD",
      paidAt: new Date("2026-07-18T12:00:00.000Z"),
      reference: "CB-SOPHIE",
    },
  });
  if (sophieQuote) {
    await prisma.quote.update({ where: { id: sophieQuote.id }, data: { status: "CONVERTED" } });
  }

  const creditHt = 8900;
  const creditTtc = Math.round((creditHt * 12000) / 10000);
  await prisma.creditNote.create({
    data: {
      companyId,
      clientId: verre.id,
      invoiceId: verreInvoice.id,
      creditNumber: "A-2026-00001",
      status: "ISSUED",
      kind: "PARTIAL",
      issueDate: new Date("2026-08-01T12:00:00.000Z"),
      reason: "Ampoule défectueuse — geste commercial",
      taxRateBps: 2000,
      totalHtCents: creditHt,
      totalTaxCents: creditTtc - creditHt,
      totalTtcCents: creditTtc,
    },
  });
  await prisma.invoice.update({
    where: { id: verreInvoice.id },
    data: {
      creditedCents: creditTtc,
      amountDueCents: Math.max(0, verreTotals.totalTtcCents - 20000 - creditTtc),
    },
  });

  async function refresh(clientId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { clientId, deletedAt: null, NOT: { status: "DRAFT" } },
    });
    const balanceCents = invoices
      .filter((invoice) => invoice.status !== "CANCELLED")
      .reduce((sum, invoice) => sum + invoice.amountDueCents, 0);
    await prisma.client.update({ where: { id: clientId }, data: { balanceCents } });
  }
  await refresh(marc.id);
  await refresh(verre.id);
  await refresh(sophie.id);

  await prisma.companySettings.update({
    where: { companyId },
    data: { nextInvoiceSeq: 4, nextCreditSeq: 2 },
  });

  console.log("Seed facturation OK — 3 factures, 1 avoir, 1 relance");
}

async function main() {
  const existing = await prisma.company.findFirst();
  if (existing) {
    console.log("Entreprise déjà présente, seed clients ignoré.");
    await seedProducts(existing.id);
    await seedQuotes(existing.id);
    await seedBilling(existing.id);
    await ensureConvertibleQuote(existing.id);
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: "Atelier Nord Lumière",
      addressLine1: "18 rue des Tanneurs",
      postalCode: "59000",
      city: "Lille",
      country: "FR",
      phone: "03 20 12 45 78",
      email: "contact@atelier-nord.fr",
      siret: "84920371600027",
      vatNumber: "FR34849203716",
      paymentTerms: "Paiement à 30 jours",
      iban: "FR76 3000 4000 0100 0123 4567 890",
      bic: "BNPAFRPP",
      settings: {
        create: {
          nextClientSeq: 9,
          nextProductSeq: 9,
          nextQuoteSeq: 4,
        },
      },
    },
  });

  const clients = [
    {
      clientNumber: "C-00001",
      name: "Maison Verre & Co",
      type: "COMPANY",
      status: "ACTIVE",
      billingLine1: "42 avenue de la République",
      billingPostalCode: "75011",
      billingCity: "Paris",
      phone: "01 43 57 21 09",
      email: "achat@maisonverre.fr",
      siret: "55210055400013",
      vatNumber: "FR12552100554",
      notes: "Client historique — tarif professionnel.",
      balanceCents: 248000,
      contact: { firstName: "Claire", lastName: "Morel", role: "Achats", email: "claire.morel@maisonverre.fr", phone: "01 43 57 21 10" },
    },
    {
      clientNumber: "C-00002",
      name: "Hôtel des Dunes",
      type: "COMPANY",
      status: "ACTIVE",
      billingLine1: "8 boulevard de la Plage",
      billingPostalCode: "62520",
      billingCity: "Le Touquet",
      phone: "03 21 05 88 40",
      email: "direction@hoteldesdunes.fr",
      siret: "79465321800021",
      vatNumber: "FR88794653218",
      notes: "Chantier rénovation hall — devis en cours.",
      balanceCents: 0,
      contact: { firstName: "Antoine", lastName: "Leblanc", role: "Directeur", email: "a.leblanc@hoteldesdunes.fr", phone: "06 12 44 90 33" },
    },
    {
      clientNumber: "C-00003",
      name: "Sophie Martin",
      type: "INDIVIDUAL",
      status: "ACTIVE",
      billingLine1: "12 impasse des Lilas",
      billingPostalCode: "59800",
      billingCity: "Lille",
      phone: "06 78 21 44 19",
      email: "sophie.martin@email.fr",
      siret: "",
      vatNumber: "",
      notes: "Particulier — pose de luminaires cuisine.",
      balanceCents: 18600,
      contact: { firstName: "Sophie", lastName: "Martin", role: "Contact principal", email: "sophie.martin@email.fr", phone: "06 78 21 44 19" },
    },
    {
      clientNumber: "C-00004",
      name: "Cabinet Rivière Avocats",
      type: "COMPANY",
      status: "ACTIVE",
      billingLine1: "5 place du Théâtre",
      billingPostalCode: "59000",
      billingCity: "Lille",
      phone: "03 20 54 11 02",
      email: "secretariat@riviere-avocats.fr",
      siret: "44306184100045",
      vatNumber: "FR76443061841",
      notes: "",
      balanceCents: -12000,
      contact: { firstName: "Nadia", lastName: "Rivière", role: "Associée", email: "n.riviere@riviere-avocats.fr", phone: "03 20 54 11 02" },
    },
    {
      clientNumber: "C-00005",
      name: "Boulangerie Pain d'Été",
      type: "COMPANY",
      status: "INACTIVE",
      billingLine1: "3 rue Gambetta",
      billingPostalCode: "59100",
      billingCity: "Roubaix",
      phone: "03 20 89 12 44",
      email: "contact@paindete.fr",
      siret: "81234567800019",
      vatNumber: "FR40812345678",
      notes: "Fermeture saisonnière — réactiver en septembre.",
      balanceCents: 0,
      contact: { firstName: "Paul", lastName: "Duhamel", role: "Gérant", email: "paul@paindete.fr", phone: "06 22 18 07 41" },
    },
    {
      clientNumber: "C-00006",
      name: "Marc Lefèvre",
      type: "INDIVIDUAL",
      status: "BLOCKED",
      billingLine1: "27 rue de Wazemmes",
      billingPostalCode: "59000",
      billingCity: "Lille",
      phone: "07 81 03 55 62",
      email: "marc.lefevre@email.fr",
      siret: "",
      vatNumber: "",
      notes: "Impayé répété — ne plus livrer sans acompte.",
      balanceCents: 94000,
      contact: { firstName: "Marc", lastName: "Lefèvre", role: "Contact principal", email: "marc.lefevre@email.fr", phone: "07 81 03 55 62" },
    },
    {
      clientNumber: "C-00007",
      name: "Sciences Lab Hauts-de-France",
      type: "COMPANY",
      status: "ACTIVE",
      billingLine1: "Parc Eurasanté, 200 rue du Marais",
      billingPostalCode: "59120",
      billingCity: "Loos",
      phone: "03 20 96 70 15",
      email: "achats@scienceslab.fr",
      siret: "38012345600028",
      vatNumber: "FR19380123456",
      notes: "Bon de commande obligatoire.",
      balanceCents: 512350,
      contact: { firstName: "Élodie", lastName: "Carpentier", role: "Responsable achats", email: "e.carpentier@scienceslab.fr", phone: "03 20 96 70 16" },
    },
    {
      clientNumber: "C-00008",
      name: "Camille Roux",
      type: "INDIVIDUAL",
      status: "ACTIVE",
      billingLine1: "9 allée des Peupliers",
      billingPostalCode: "59650",
      billingCity: "Villeneuve-d'Ascq",
      phone: "06 14 88 32 07",
      email: "camille.roux@email.fr",
      siret: "",
      vatNumber: "",
      notes: "",
      balanceCents: 0,
      contact: { firstName: "Camille", lastName: "Roux", role: "Contact principal", email: "camille.roux@email.fr", phone: "06 14 88 32 07" },
    },
  ];

  for (const row of clients) {
    const { contact, ...data } = row;
    await prisma.client.create({
      data: {
        ...data,
        companyId: company.id,
        contacts: {
          create: { ...contact, isPrimary: true },
        },
      },
    });
  }

  await seedProducts(company.id);
  await seedQuotes(company.id);
  await seedBilling(company.id);
  await ensureConvertibleQuote(company.id);
  console.log("Seed OK — Atelier Nord Lumière + 8 clients");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
