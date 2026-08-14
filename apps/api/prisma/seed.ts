import { PrismaClient } from "@prisma/client";

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

async function main() {
  const existing = await prisma.company.findFirst();
  if (existing) {
    console.log("Entreprise déjà présente, seed clients ignoré.");
    await seedProducts(existing.id);
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
