# État du projet Facturier

Dernière mise à jour : 14 août 2026  
Branche : `cursor/facturier-clients-module`  
Entreprise de démo : **Atelier Nord Lumière**

Dev : `npm run dev` — API http://localhost:3001/api/v1 — Web http://localhost:5173

---

## Fait

### Socle

- Monorepo `apps/web` (React, Vite, Tailwind, PWA), `apps/api` (NestJS, Prisma, SQLite), `packages/shared`
- Shell PWA : nav desktop + barre mobile, copy FR, montants en centimes
- Multi-tenant : tout filtré par `companyId` (une entreprise seedée, pas d’auth)
- `AuditLog` écrit sur les mutations métier (pas d’écran dédié)

### Clients `/clients`

- Liste (recherche, type, statut), cartes mobile / tableau desktop
- CRUD, duplication, export CSV, soft-delete si aucun document lié
- Fiche : coordonnées, contact, notes, solde recalculé, historique devis + factures
- Client `BLOCKED` : consultation OK, création devis/facture refusée

### Tarifs `/tarifs`

- Catalogue `Product` + `ProductCategory` (matériel, main-d’œuvre, service, déplacement)
- Unités, TVA `taxRateBps`, prix HT en centimes, statut actif / archivé
- CRUD, duplication, export CSV

### Devis `/devis`

- Éditeur de lignes (catalogue + lignes libres), remises, frais de déplacement, acompte
- Numérotation `D-YYYY-00001` à la création
- Workflow : `DRAFT → SENT → PENDING → ACCEPTED / REJECTED / EXPIRED`
- Conversion d’un devis `ACCEPTED` vers une facture brouillon (`quoteId` conservé → `CONVERTED`)

### Factures `/factures`

- Saisie manuelle, duplication, conversion depuis devis
- Brouillon éditable ; numéro `F-YYYY-00001` **à l’émission uniquement** (sans trou)
- Facture émise gelée : pas de modification ni suppression ; correction par avoir
- Paiements partiels sur la fiche (`amountDue = TTC − payé − avoirs`)
- Statuts dérivés : `ISSUED`, `SENT`, `PARTIAL`, `PAID`, `OVERDUE`, `CREDITED`

### Avoirs `/avoirs`

- Liés à une facture émise, motif obligatoire, total ou partiel
- Plafond = restant dû ; numéro `A-YYYY-00001` à l’émission
- Soft-delete des brouillons uniquement

### Relances `/relances`

- File : factures échues non soldées + devis `SENT` / `PENDING` proches de l’expiration
- Filtres factures / devis, cartes mobile, export CSV
- Enregistrement des relances niveaux 1 / 2 / mise en demeure + historique

### Tableau de bord `/tableau-de-bord`

- KPI année : CA TTC, encaissé, restant dû, échus, devis ouverts
- Histogramme mensuel, file à relancer, dernières factures, clients à recouvrer
- Accueil par défaut (nav mobile « Accueil »)

### Rapports `/rapports`

- Période libre : CA HT/TVA/TTC, encaissements, avoirs, impayés
- Détail TVA par taux, ventilation mensuelle, liste des impayés
- Export CSV

### Seed

- 8 clients, 8 articles, devis d’exemple
- `F-2026-00001` en retard (Marc Lefèvre) + 1re relance
- `F-2026-00002` partielle + avoir `A-2026-00001` (Maison Verre)
- `F-2026-00003` payée depuis `D-2026-00003` (Sophie Martin)
- `D-2026-00005` accepté, prêt à convertir (Cabinet Rivière)

---

## Écrans encore « Bientôt disponible »

| Route | Module |
|-------|--------|
| `/paiements` | Liste globale des paiements (saisie déjà sur la facture) |
| `/documents` | Archive PDF |
| `/parametres` | Profil entreprise, mentions, numérotation |

---

## Todo — suite MVP

Ordre recommandé. Ne pas sauter le PDF : c’est la prochaine brique métier.

### 1. Export PDF (prochaine étape)

- [ ] Templates HTML/CSS + Puppeteer (devis, facture, avoir)
- [ ] Mentions légales FR (identité, SIRET, TVA, échéance, pénalités, 40 € pro)
- [ ] Notes internes exclues du PDF
- [ ] Télécharger / imprimer ; stocker `pdfUrl`
- [ ] Modèles `Document` / `DocumentTemplate` si besoin

### 2. Paramètres entreprise

- [ ] Fiche société (adresse, SIRET, TVA, IBAN, BIC, logo)
- [ ] Préfixes et prochain n° (lecture, pas de trou à l’émission)
- [ ] Délai de paiement par défaut, mentions, CGV, couleur PDF

### 3. Paiements (vue globale)

- [ ] Liste `/paiements` (filtre facture, client, période, moyen)

### 4. E-mail

- [ ] Envoi devis / facture / relance (PDF en pièce jointe)
- [ ] Journal d’envoi (pas seulement le statut `SENT`)

### 5. Auth et multi-utilisateurs

- [ ] Login, rôles `ADMIN` / `EMPLOYEE` / `ACCOUNTANT`
- [ ] Plus de `companyId` hardcodé côté API
- [ ] PostgreSQL prod (même schéma Prisma)

### 6. Conformité et produit (plus tard)

- [ ] Purge RGPD / export complet des données
- [ ] Écran journal d’audit
- [ ] Auto-liquidation / exonération TVA
- [ ] Listes de prix (`PriceList`)
- [ ] Recherche globale header
- [ ] PWA : icônes 192/512, install, offline lecture si utile
- [ ] Bureau Tauri (optionnel, jamais Electron sauf demande)
