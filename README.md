# DynamicMind

Carte interactive du continent africain, en React.

- Survol d'un pays : surbrillance animée et infobulle avec ses informations.
- Clic : panneau de détails et zoom animé vers les régions du pays, puis vers leurs subdivisions.

Projet personnel, construit module par module.

## Démarrer

```bash
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Lint (oxlint) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run coverage` | Couverture de tests |
| `npm run e2e` | Tests de bout en bout (Playwright) |
| `npm run prepare:countries` | Régénère `public/geo/africa.topo.json` depuis Natural Earth |

## Données

- Pays : [Natural Earth](https://www.naturalearthdata.com/) admin-0 1:50m (domaine public), version v5.1.2.
- 54 pays de l'ONU cliquables ; Sahara occidental affiché mais non cliquable ; Somaliland rattaché à la Somalie.

## Stack

Vite, React, d3-geo, TopoJSON, Vitest, Testing Library, Playwright.
