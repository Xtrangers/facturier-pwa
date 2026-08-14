---
name: facturier
description: Guides architecture, stack, folder structure, and feature workflow for the Facturier invoicing PWA. Use when scaffolding, extending, or implementing any Facturier module (clients, tarifs, devis, factures, PDF, dashboard, PWA).
---

# Facturier — architecture

Application de gestion commerciale et facturation (France), PWA multiplateforme.

## Stack verrouillé

| Couche | Choix |
|--------|--------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + React Router |
| PWA | `vite-plugin-pwa` (installable Android / iOS / desktop) |
| Backend | NestJS + Prisma |
| BDD locale | SQLite (`file:./dev.db`) |
| BDD prod | PostgreSQL (même schéma Prisma) |
| Auth (plus tard) | Auth.js ou NestJS JWT — pas avant le module utilisateurs |
| PDF (plus tard) | Puppeteer + templates HTML/CSS |
| Bureau (optionnel) | Tauri, jamais Electron sauf demande explicite |

Ne pas introduire Vue, Angular, GraphQL, Firebase, Supabase, ni un autre ORM sans demande.

## Structure

```
facturier/
  apps/web/          # PWA React
  apps/api/          # NestJS
  packages/shared/   # types + constantes partagés
  .cursor/skills/    # skills produit
```

Chemins API : `http://localhost:3001/api/v1/...`
Frontend : `http://localhost:5173` (proxy `/api` → API)

## Ordre d’implémentation

1. Clients (en cours)
2. Tarifs / matériels / prestations
3. Devis
4. Factures + numérotation
5. Export PDF
6. Paiements et relances
7. Avoirs, rapports, multi-utilisateurs

Ne pas implémenter une phase suivante tant que la phase courante n’est pas utilisable (CRUD + UI responsive + API).

## Conventions code

- UI et copy **en français**
- TypeScript `strict`
- Montants en **centimes entiers** en base (`totalHtCents`), formatés en euros à l’affichage
- Toutes les entités métier portent `companyId`
- Dates en ISO UTC côté API, affichage `fr-FR`
- Jamais de suppression physique des factures / avoirs / paiements (voir skill `facturier-legal-fr`)
- Soft-delete clients et produits (`deletedAt`) sauf si l’utilisateur confirme et qu’aucun document n’est lié
- REST JSON, DTOs `class-validator`, Prisma pour la persistence
- NestJS + `tsx` : toujours `@Inject(Service)` dans les constructeurs (esbuild n’émet pas les metadata)
- Composants UI dans `apps/web/src/components`, pages dans `apps/web/src/pages`
- Modules Nest : un module par domaine (`clients`, `products`, `quotes`, …)

## Ajouter une fonctionnalité

1. Lire le skill domaine concerné (`facturier-clients`, `facturier-documents`, …)
2. Mettre à jour `packages/shared` (types + enums)
3. Prisma schema + migration
4. Module Nest (service, controller, DTOs)
5. Pages + composants React
6. États vides, erreurs, loading, mobile

## Skills liés

- [facturier-domain](../facturier-domain/SKILL.md) — modèle de données
- [facturier-ui](../facturier-ui/SKILL.md) — interface PWA
- [facturier-legal-fr](../facturier-legal-fr/SKILL.md) — mentions et règles FR
- [facturier-clients](../facturier-clients/SKILL.md) — module clients
- [facturier-documents](../facturier-documents/SKILL.md) — devis, factures, avoirs, PDF
