import { AppError } from './AppError.js';

/**
 * Erreur levée lorsqu'un service externe (Nominatim ou Open-Meteo) est inaccessible ou renvoie une erreur.
 */
export class ExternalServiceError extends AppError {
  /**
   * @param {string} serviceName
   * @param {string} details
   * @param {number} [originalStatusCode]
   */
  constructor(serviceName, details, originalStatusCode = null) {
    super(`Erreur lors de la communication avec le service tiers [${serviceName}] : ${details}`, 502);
    this.serviceName = serviceName;
    this.details = details;
    this.originalStatusCode = originalStatusCode;
  }
}
