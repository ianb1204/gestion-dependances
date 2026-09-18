/**
 * Contrat d'interface pour le service de géocodage.
 * Découple le reste de l'application de l'implémentation spécifique (ex: Nominatim, Google Maps, Mapbox).
 */
export class GeocodingServiceInterface {
  /**
   * Géocode une adresse en coordonnées géographiques (latitude, longitude).
   * @param {string} address - Adresse postale ou nom de lieu
   * @returns {Promise<import('../../domain/models/Location.js').Location>}
   */
  async geocode(address) {
    throw new Error('La méthode geocode() doit être implémentée.');
  }
}
