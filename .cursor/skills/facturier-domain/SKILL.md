---
name: facturier-domain
description: Defines Facturier domain model, Prisma entities, statuses, numbering, and money rules. Use when adding tables, DTOs, shared types, relations, or business fields for clients, products, quotes, invoices, payments, or credit notes.
---

# Facturier — domaine

Source de vérité du modèle. Détail Prisma : [schema.md](schema.md).

## Multi-tenant

Une `Company` possède tout. Filtrer **toujours** par `companyId` (jamais d’accès cross-entreprise).

MVP : une entreprise seedée, `companyId` fixe côté API jusqu’à l’auth.

## Entités MVP (phase clients + socle)

`Company`, `CompanySettings`, `User` (stub), `Client`, `ClientContact`

## Entités suivantes (ne pas créer tant que non demandées, mais types OK dans shared)

`Product`, `ProductCategory`, `PriceList`, `Quote`, `QuoteLine`, `Invoice`, `InvoiceLine`, `CreditNote`, `Payment`, `Document`, `DocumentTemplate`, `Attachment`, `Reminder`, `AuditLog`

## Argent

- Stockage : `Int` centimes (`12345` = 123,45 €)
- Calculs uniquement en centimes, arrondi commercial (half-up) à 2 décimales
- TVA française par défaut : `0`, `55`, `100`, `200` (en dixièmes de % → 0 / 5,5 / 10 / 20 %) **ou** `taxRateBps` en points de base (2000 = 20 %). **Choix du projet : `taxRateBps` (integer, 2000 = 20 %).**

## Numérotation

Séquences par entreprise et par type de document, **sans trou** une fois le document émis.

Formats par défaut :

- Client : `C-00001`
- Devis : `D-YYYY-00001`
- Facture : `F-YYYY-00001`
- Avoir : `A-YYYY-00001`

Un numéro de facture émise n’est **jamais** réutilisé.

## Statuts

**Client :** `ACTIVE` | `INACTIVE` | `BLOCKED`

**Devis :** `DRAFT` | `SENT` | `PENDING` | `ACCEPTED` | `REJECTED` | `EXPIRED` | `CONVERTED`

**Facture :** `DRAFT` | `ISSUED` | `SENT` | `PARTIAL` | `PAID` | `OVERDUE` | `CANCELLED` | `CREDITED`

Les enums TypeScript vivent dans `packages/shared`. Prisma `enum` doit matcher.

## Audit

Toute mutation métier écrit un `AuditLog` : `entity`, `entityId`, `action`, `userId`, `payload`, `createdAt`. Pour le MVP clients : logger create / update / delete / duplicate / export.

## Règles transverses

- Client `BLOCKED` : on peut consulter, pas créer de devis/facture (à enforce plus tard)
- Solde client = somme `amountDue` des factures non annulées − avoirs
- Dupliquer une fiche = nouvel id, nouveau numéro, suffixe « (copie) » sur le nom
