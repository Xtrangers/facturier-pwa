---
name: facturier-ui
description: Defines Facturier PWA UI system, layout, breakpoints, components, and French copy. Use when building pages, forms, tables, navigation, empty states, or any React UI in apps/web.
---

# Facturier — UI

## Breakpoints

- Mobile : `320–767` — nav bas, listes cartes, filtres en sheet
- Tablette : `768–1023` — nav gauche compacte
- Desktop : `≥1024` — nav gauche + tableau

Tailwind : `sm` 640, `md` 768, `lg` 1024. Utiliser `md:` et `lg:` comme seuils produit.

## Shell

Layout unique `AppShell` :

- Header : titre de page, recherche globale (plus tard), menu utilisateur
- Nav : Tableau de bord, Clients, Tarifs, Devis, Factures, Avoirs, Paiements, Relances, Rapports, Documents, Paramètres
- Livré : Clients, Tarifs, Devis, Factures, Avoirs, Relances, Tableau de bord, Rapports, Paiements, Documents
- Pages non encore bâties : lien visible, écran « Bientôt disponible » (paramètres)

Nav mobile : barre inférieure avec 5 items (Accueil, Clients, Devis, Factures, Plus).

## Design tokens

Palette sobre, pro, lisible (facturation) :

- Fond : `zinc-50` / surfaces `white`
- Texte : `zinc-900` / secondaire `zinc-500`
- Accent : `teal-700`
- Danger : `red-600`
- Succès : `emerald-600`
- Warning : `amber-600`

Rayon `rounded-xl`, ombre légère `shadow-sm`, focus ring teal.

Pas de thème dark pour le MVP.

## Composants à réutiliser

| Composant | Usage |
|-----------|--------|
| `PageHeader` | Titre, sous-titre, actions (Nouveau, Exporter) |
| `SearchInput` | Recherche |
| `FilterBar` | Filtres desktop ; bouton Filtres → sheet mobile |
| `StatusBadge` | Statuts colorés |
| `DataTable` | Tableau desktop |
| `EntityCard` | Carte mobile |
| `EmptyState` | Liste vide + CTA |
| `SlideOver` / page dédiée | Formulaire création / édition |
| `ConfirmDialog` | Suppressions |

## Formulaires

- Labels au-dessus des champs, français
- Erreurs sous le champ
- Sections pliables si > 8 champs (ex. adresses)
- Sauvegarde : bouton principal « Enregistrer », secondaire « Annuler »
- Adresse de livraison : case « Identique à la facturation »

## Accessibilité

- Boutons avec `type`, focus visible
- Tableaux avec en-têtes
- Touch targets ≥ 44px sur mobile

## PWA

- `manifest.webmanifest` : nom « Facturier », `display: standalone`, theme teal
- Icônes 192 / 512
- Viewport `width=device-width, initial-scale=1, viewport-fit=cover`
- Pas de hover-only pour les actions essentielles
