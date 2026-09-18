import { GeocodingServiceInterface } from '../interfaces/GeocodingServiceInterface.js';
import { Location } from '../../domain/models/Location.js';
import { LocationNotFoundError } from '../../domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../domain/errors/ExternalServiceError.js';

/**
 * Service de géocodage utilisant l'API Adresse de la Base Adresse Nationale (BAN - data.gouv.fr).
 * Fournisseur souverain français conforme au RGPD.
 * Dépendance injectée : httpClient (respect de l'Inversion de Contrôle et DI).
 */
export class BanGeocodingService extends GeocodingServiceInterface {
  /**
   * @param {Object} params
   * @param {import('../interfaces/HttpClientInterface.js').HttpClientInterface} params.httpClient
   * @param {string} [params.baseUrl]
   * @param {string} [params.userAgent]
   */
  constructor({
    httpClient,
    baseUrl = 'https://api-adresse.data.gouv.fr',
    userAgent = 'TP2-MeteoApi/1.0 ian.bertin2004@gmail.com',
  } = {}) {
    super();
    if (!httpClient) {
      throw new Error('BanGeocodingService requiert un httpClient injecté.');
    }
    this.httpClient = httpClient;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.userAgent = userAgent;
  }

  /**
   * Géocode une adresse en coordonnées via l'API BAN.
   * @param {string} address
   * @returns {Promise<Location>}
   */
  async geocode(address) {
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new LocationNotFoundError(address || '');
    }

    const trimmedAddress = address.trim();
    const url = `${this.baseUrl}/search/?q=${encodeURIComponent(trimmedAddress)}&limit=1`;

    let data;
    try {
      data = await this.httpClient.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      throw new ExternalServiceError('BAN', err.message, err.status);
    }

    if (!data || typeof data !== 'object' || !Array.isArray(data.features) || data.features.length === 0) {
      throw new LocationNotFoundError(trimmedAddress);
    }

    const firstFeature = data.features[0];
    const coordinates = firstFeature.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new ExternalServiceError('BAN', 'Coordonnées retournées invalides.');
    }

    // Le format GeoJSON spécifie [longitude, latitude]
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ExternalServiceError('BAN', 'Coordonnées retournées invalides.');
    }

    // Extraction du libellé sans fuite du DTO propriétaire GeoJSON
    const displayName = firstFeature.properties?.label
      || firstFeature.properties?.name
      || trimmedAddress;

    return new Location({
      displayName,
      latitude,
      longitude,
    });
  }
}
