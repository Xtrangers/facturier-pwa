---
name: facturier-legal-fr
description: French invoicing compliance rules for Facturier (TVA, numbering, mentions légales, RGPD, no hard-delete). Use when implementing invoices, credit notes, PDF templates, company profile, audit logs, or data export/retention.
---

# Facturier — conformité France

Ne pas présenter le logiciel comme certifié expert-comptable. Les règles ci-dessous sont des garde-fous produit ; validation comptable avant production.

## Factures

- Numérotation **chronologique, continue, sans trou** une fois émise
- Interdiction de supprimer une facture émise : **annulation via avoir** (ou statut `CANCELLED` seulement si brouillon jamais émis)
- Conservation des PDF et de l’historique (dates, montants, auteur)
- Mentions selon type client (pro / particulier) : identité vendeur, SIRET, n° TVA, date, n° facture, désignation, HT, taux et montant TVA, TTC, échéance, pénalités de retard, indemnité forfaitaire 40 € (pro)

## Devis

- Numérotation distincte des factures
- Date de validité
- Conversion devis → facture conserve le lien `quoteId`

## Avoirs

- Liés à une facture d’origine
- Numérotation propre
- Motif obligatoire
- Total ou partiel, jamais supérieur au restant facturable

## Clients / RGPD

- Base licite : exécution contrat / obligation légale
- Export des données client (CSV)
- Soft-delete ; purge définitive seulement via procédure prévue plus tard
- Pas de données santé / sensibles
- Notes internes : ne pas les imprimer sur PDF

## Sécurité (socle)

- HTTPS en prod
- Mots de passe hashés (quand auth)
- Rôles : `ADMIN`, `EMPLOYEE`, `ACCOUNTANT`
- Journal d’audit
- Pas de secrets dans le frontend

## TVA

Taux usuels FR : 20 %, 10 %, 5,5 %, 0 %. Auto-liquidation / exonération : champs prévus plus tard, pas dans le MVP clients.
