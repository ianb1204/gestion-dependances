/**
 * Modèle de domaine représentant les prévisions météorologiques.
 */
export class WeatherForecast {
  /**
   * @param {Object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {string} [params.timezone]
   * @param {Object} [params.current] - Données météo actuelles
   * @param {Object} [params.hourly] - Données météo horaires
   * @param {Object} [params.raw] - Données brutes de l'API
   */
  constructor({ latitude, longitude, timezone = 'UTC', current = null, hourly = null, raw = {} }) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.timezone = timezone;
    this.current = current;
    this.hourly = hourly;
    this.raw = raw;
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
