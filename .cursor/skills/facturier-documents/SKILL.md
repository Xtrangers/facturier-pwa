---
name: facturier-documents
description: Guides quotes, invoices, credit notes, payments, numbering, and PDF generation for Facturier. Use when implementing devis, factures, avoirs, paiements, relances, Puppeteer PDF, or document templates — not for the clients module.
---

# Facturier — documents (devis, factures, avoirs)

Clients, devis, factures, avoirs, paiements, relances, archive documents, paramètres, PDF et e-mail sont **livrés**. Phase courante : **auth**. Détail : [STATUS.md](../../../STATUS.md).

## Pipeline

Client → lignes catalogue ou libres → document (devis ou facture) → PDF → e-mail → (facture) paiements / avoirs.

## Calcul d’une ligne

```
lineHt = qty * unitPriceCents
lineHtAfterDiscount = apply discount (percent or amount cents)
taxCents = round(lineHtAfterDiscount * taxRateBps / 10000)
lineTtc = lineHtAfterDiscount + taxCents
```

Totaux document = somme des lignes + frais. Remise globale appliquée après somme si présente.

## Devis

Création : client, lignes, remise, frais déplacement, notes, conditions, validité, acompte optionnel.

Conversion : uniquement si `ACCEPTED` ; crée une facture `DRAFT` liée.

## Factures

Sources : devis accepté, duplication, saisie manuelle.

Brouillon éditable. Une fois `ISSUED`, champs financiers gelés ; corrections par avoir.

Paiements : partiels autorisés ; `amountDue = totalTtc - amountPaid` (avoirs déduits). Liste globale `/paiements` (période, moyen, CSV) + saisie sur la fiche facture.

## PDF

Templates HTML/CSS + Puppeteer. Logo, couleur, CGV, IBAN, mentions légales lus depuis `/parametres`. Notes internes **exclues**. Filigrane brouillon.

Actions : télécharger, imprimer, envoyer e-mail, archiver `pdfUrl`.

## Relances

Livré : file factures échues + devis `SENT` / `PENDING` proches de l’expiration ; niveaux 1 / 2 / mise en demeure ; export CSV ; e-mail avec PDF joint.
