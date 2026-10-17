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
| `npm run prepare:info` | Régénère `src/data/countries-info.json` et `public/flags/` (`-- --refresh` pour retélécharger) |
| `npm run prepare:boundaries` | Régénère `public/geo/adm1/` (régions) et `public/geo/adm2/` (subdivisions) depuis geoBoundaries et Wikidata |

## Données

- Pays : [Natural Earth](https://www.naturalearthdata.com/) admin-0 1:50m (domaine public), version v5.1.2.
- Fiches pays et drapeaux : [mledoze/countries](https://github.com/mledoze/countries) (licence [ODbL](https://opendatacommons.org/licenses/odbl/1-0/)).
- Population : [Banque mondiale](https://data.worldbank.org/indicator/SP.POP.TOTL) (CC BY 4.0).
- Noms des capitales en français : [Wikidata](https://www.wikidata.org/) (CC0).
- Régions (ADM1) : [geoBoundaries](https://www.geoboundaries.org/) gbOpen, commit `9469f09`. La licence varie selon le pays (ODbL, CC BY, CC BY-SA, domaine public…) : elle est conservée dans chaque fichier (`meta.license`) et affichée dans la fiche de la région.
- Subdivisions (ADM2) : geoBoundaries gbOpen. Elles sont rattachées à leur région par la géométrie (la source ne donne pas le parent) ; une région n'est découpée que si ses subdivisions la couvrent de façon cohérente. Pas de subdivisions exploitables pour l'Algérie (niveau dupliqué), la Libye, Maurice et les Seychelles.
- Noms français, chefs-lieux et populations des régions : Wikidata (CC0), via le code ISO 3166-2. Les noms restent ceux de geoBoundaries quand Wikidata ne les connaît pas (Côte d'Ivoire, Madagascar, Seychelles…).
- 54 pays de l'ONU cliquables ; Sahara occidental affiché mais non cliquable ; Somaliland rattaché à la Somalie.

## Stack

Vite, React, d3-geo, TopoJSON, Vitest, Testing Library, Playwright.
