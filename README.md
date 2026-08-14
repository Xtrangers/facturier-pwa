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

Premier PDF : Chrome est téléchargé par Puppeteer (`npx puppeteer browsers install chrome` dans `apps/api` si besoin). Sans SMTP, les e-mails sont tracés dans le journal et déposés en `.eml` sous `apps/api/storage/mail`.

## Stack

| Couche | Choix |
|--------|--------|
| Web | React, TypeScript, Vite, Tailwind, PWA |
| API | NestJS, Prisma |
| Dev | SQLite (`apps/api/prisma/dev.db`) |
| Prod (prévu) | PostgreSQL, même schéma |
| Types | `packages/shared` |

## Modules livrés

Clients, tarifs, devis, factures, avoirs, relances, tableau de bord, rapports, paiements, documents, paramètres, PDF, e-mail.

## Prochaine étape

Auth / multi-utilisateurs, puis PostgreSQL prod.

## Skills agent

Instructions produit dans `.cursor/skills/` (`facturier`, `facturier-domain`, `facturier-ui`, `facturier-legal-fr`, `facturier-clients`, `facturier-documents`).
