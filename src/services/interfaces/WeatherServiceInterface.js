/**
 * Contrat d'interface pour le service météo.
 * Découple le reste de l'application du fournisseur météo spécifique (ex: Open-Meteo, Météo-France, AccuWeather).
 */
export class WeatherServiceInterface {
  /**
   * Récupère les prévisions météorologiques pour des coordonnées données.
   * @param {number} latitude
   * @param {number} longitude
   * @param {Object} [options]
   * @returns {Promise<import('../../domain/models/WeatherForecast.js').WeatherForecast>}
   */
  async getForecast(latitude, longitude, options = {}) {
    throw new Error('La méthode getForecast() doit être implémentée.');
  }
}
