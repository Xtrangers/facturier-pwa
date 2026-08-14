# Schéma Prisma cible

## Company

- id, name, logoUrl, addressLine1, addressLine2, postalCode, city, country (défaut FR)
- phone, email, siret, vatNumber, paymentTerms, iban, bic
- createdAt, updatedAt

## CompanySettings

- companyId unique
- invoicePrefix, quotePrefix, creditPrefix, clientPrefix
- nextInvoiceSeq, nextQuoteSeq, nextCreditSeq, nextClientSeq
- defaultTaxRateBps, defaultDueDays
- pdfPrimaryColor, legalMentions, termsAndConditions

## Client

- id, companyId
- clientNumber (unique par company)
- name (nom ou raison sociale)
- type: `INDIVIDUAL` | `COMPANY`
- status: `ACTIVE` | `INACTIVE` | `BLOCKED`
- billingAddress (json: line1, line2, postalCode, city, country)
- shippingAddress (json, nullable — copie facturation si vide)
- phone, email
- siret, vatNumber (obligatoires si type COMPANY, optionnels sinon)
- notes
- balanceCents (dénormalisé, recalculé)
- deletedAt
- createdAt, updatedAt

## ClientContact

- id, clientId
- firstName, lastName, role, email, phone, isPrimary

Index : `(companyId, clientNumber)` unique, `(companyId, email)`, `(companyId, name)`, `(companyId, status)`.

## Quote / QuoteLine

- Numéro `D-YYYY-00001`, totaux en centimes, `taxRateBps`
- Statuts : DRAFT, SENT, PENDING, ACCEPTED, REJECTED, EXPIRED, CONVERTED
- Lien optionnel vers facture via `Invoice.quoteId`

## Invoice / InvoiceLine

- Numéro `F-YYYY-00001` attribué à l’émission (brouillon : `invoiceNumber` null)
- Statuts : DRAFT, ISSUED, SENT, PARTIAL, PAID, OVERDUE, CANCELLED, CREDITED
- `amountPaidCents`, `creditedCents`, `amountDueCents`
- Une fois émise : plus de modification ni suppression ; correction par avoir

## Payment

- Lié à une facture, `amountCents`, `method`, `paidAt`, `reference`
- Partiels autorisés, jamais au-delà du restant dû

## CreditNote

- Numéro `A-YYYY-00001` à l’émission, motif obligatoire
- Kind TOTAL | PARTIAL, jamais supérieur au restant dû
- Soft-delete des brouillons uniquement

## Reminder

- Cible INVOICE ou QUOTE, niveau 1 / 2 / 3
- File : factures échues non soldées + devis SENT/PENDING proches de l’expiration
