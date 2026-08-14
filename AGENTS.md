# Facturier

Webapp PWA de gestion commerciale et facturation (France).

État du livré et todo : [STATUS.md](STATUS.md). **Prochaine étape : export PDF.**

## Skills

Les instructions produit sont dans `.cursor/skills/`. Les charger selon le module en cours.

- `facturier` — architecture
- `facturier-domain` — modèle
- `facturier-ui` — interface
- `facturier-legal-fr` — conformité
- `facturier-clients` — clients
- `facturier-documents` — devis / factures / avoirs / PDF

## Stack

- `apps/web` — React, TypeScript, Vite, Tailwind, PWA
- `apps/api` — NestJS, Prisma, SQLite (dev)
- `packages/shared` — types et enums

## Commandes

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

API : http://localhost:3001  
Web : http://localhost:5173

Livré : clients, tarifs, devis, factures, avoirs, relances, tableau de bord, rapports, paiements, documents.  
Pas encore : PDF, e-mail, auth, paramètres.
