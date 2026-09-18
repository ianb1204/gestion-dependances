/**
 * Modèle de domaine représentant les prévisions météorologiques.
 * Respecte le principe de séparation des préoccupations : aucun DTO externe ne doit polluer le modèle de domaine.
 */
export class WeatherForecast {
  /**
   * @param {Object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {string} [params.timezone='UTC']
   * @param {Object} [params.current=null] - Données météo actuelles normalisées
   * @param {Object} [params.hourly=null] - Données météo horaires normalisées
   */
  constructor({ latitude, longitude, timezone = 'UTC', current = null, hourly = null }) {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw new TypeError('La latitude doit être un nombre valide.');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw new TypeError('La longitude doit être un nombre valide.');
    }

    this.latitude = latitude;
    this.longitude = longitude;
    this.timezone = timezone;
    this.current = current;
    this.hourly = hourly;
  }

  toJSON() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      timezone: this.timezone,
      current: this.current,
      hourly: this.hourly,
    };
  }
}
