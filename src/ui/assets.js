/** Chemin d'un fichier de public/, compatible avec un déploiement dans un sous-dossier. */
export function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
