# Facturier

PWA de gestion commerciale et facturation (France), utilisable sur navigateur, Android, iOS, Mac et Windows.

Entreprise de démo : **Atelier Nord Lumière**.

État livré / reste à faire : [STATUS.md](STATUS.md)

## Démarrage

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:3001/api/v1

## Stack

| Couche | Choix |
|--------|--------|
| Web | React, TypeScript, Vite, Tailwind, PWA |
| API | NestJS, Prisma |
| Dev | SQLite (`apps/api/prisma/dev.db`) |
| Prod (prévu) | PostgreSQL, même schéma |
| Types | `packages/shared` |

## Modules livrés

Clients, tarifs, devis, factures, avoirs, relances, tableau de bord, rapports, paiements, documents, paramètres.

## Prochaine étape

Export PDF (Puppeteer + mentions légales FR).

## Skills agent

Instructions produit dans `.cursor/skills/` (`facturier`, `facturier-domain`, `facturier-ui`, `facturier-legal-fr`, `facturier-clients`, `facturier-documents`).
