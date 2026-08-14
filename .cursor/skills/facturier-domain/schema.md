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
