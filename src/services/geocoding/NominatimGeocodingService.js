import { GeocodingServiceInterface } from '../interfaces/GeocodingServiceInterface.js';
import { Location } from '../../domain/models/Location.js';
import { LocationNotFoundError } from '../../domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../domain/errors/ExternalServiceError.js';

/**
 * Service de géocodage utilisant l'API Nominatim (OpenStreetMap).
 * Dépendance injectée : httpClient (respect de l'Inversion de Contrôle et DI).
 */
export class NominatimGeocodingService extends GeocodingServiceInterface {
  /**
   * @param {Object} params
   * @param {import('../interfaces/HttpClientInterface.js').HttpClientInterface} params.httpClient
   * @param {string} [params.baseUrl]
   * @param {string} [params.userAgent]
   */
  constructor({ httpClient, baseUrl = 'https://nominatim.openstreetmap.org', userAgent = 'WeatherApp/1.0 (TP-Gestion-Dependances)' } = {}) {
    super();
    if (!httpClient) {
      throw new Error('NominatimGeocodingService requiert un httpClient injecté.');
    }
    this.httpClient = httpClient;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.userAgent = userAgent;
  }

  /**
   * Géocode une adresse en coordonnées via Nominatim.
   * @param {string} address
   * @returns {Promise<Location>}
   */
  async geocode(address) {
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new LocationNotFoundError(address || '');
    }

    const trimmedAddress = address.trim();
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(trimmedAddress)}&format=json`;

    let data;
    try {
      data = await this.httpClient.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      throw new ExternalServiceError('Nominatim', err.message, err.status);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new LocationNotFoundError(trimmedAddress);
    }

    const firstResult = data[0];
    const latitude = parseFloat(firstResult.lat);
    const longitude = parseFloat(firstResult.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ExternalServiceError('Nominatim', 'Coordonnées retournées invalides.');
    }

    return new Location({
      displayName: firstResult.display_name,
      latitude,
      longitude,
    });
  }
}
