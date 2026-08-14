---
name: facturier-clients
description: Implements the Facturier clients module (list, fiche, CRUD, search, filters, duplicate, CSV export, balance, history). Use when building or modifying client pages, Client API, Prisma Client model, or client CSV export.
---

# Facturier — module Clients

Lire aussi `facturier`, `facturier-domain`, `facturier-ui`.

## Écrans

1. **Liste** `/clients` — recherche, filtres type/statut, tableau desktop / cartes mobile
2. **Création** `/clients/nouveau`
3. **Fiche** `/clients/:id` — résumé, coordonnées, contacts, notes, solde, historique documents (vide au MVP)
4. **Édition** `/clients/:id/modifier`

## Champs fiche

Obligatoires : `name`, `type`, `status`, adresse de facturation (`line1`, `postalCode`, `city`).

Selon `type === COMPANY` : `siret` (14 chiffres, espaces ignorés), `vatNumber` recommandé.

Optionnels : téléphone, e-mail, SIRET/TVA particulier, adresse livraison, contact principal, notes.

`clientNumber` généré côté API, lecture seule dans l’UI.

## API

Préfixe `/api/v1/clients`

| Méthode | Route | Action |
|---------|-------|--------|
| GET | `/` | Liste paginée `?q&type&status&page&pageSize` |
| POST | `/` | Créer |
| GET | `/:id` | Détail + contacts |
| PATCH | `/:id` | Modifier |
| DELETE | `/:id` | Soft-delete si aucun document ; sinon 409 |
| POST | `/:id/duplicate` | Dupliquer |
| GET | `/export` | CSV `text/csv` |

Réponse liste : `{ items, total, page, pageSize }`.

Validation e-mail, SIRET 14 digits, téléphone libre.

## Liste — colonnes desktop

N°, Nom, Type, E-mail, Téléphone, Ville, Solde, Statut, actions.

Solde coloré si ≠ 0. Badge statut : Actif teal, Inactif zinc, Bloqué red.

Actions : ouvrir, dupliquer, supprimer (confirm).

## Export CSV

Colonnes : numéro, nom, type, statut, email, téléphone, siret, tva, adresse, CP, ville, solde. Encodage UTF-8 + BOM pour Excel.

## Historique (MVP)

Bloc « Devis et factures » avec empty state : « Aucun document pour l’instant ». Brancher plus tard.

## Copy FR

- Type : Particulier / Entreprise
- Statut : Actif / Inactif / Bloqué
- Boutons : Nouveau client, Enregistrer, Dupliquer, Exporter CSV, Supprimer
