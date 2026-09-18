import { ValidationError } from '../domain/errors/ValidationError.js';

/**
 * Cas d'utilisation (Use Case) : Obtenir les prévisions météo à partir d'une adresse postale.
 * Ce cas d'utilisation orchestre le géocodage et la récupération météo.
 * 
 * Il ne dépend d'aucune implémentation concrète d'API (couplage faible, IoC).
 * Les dépendances sont injectées via le constructeur (Dependency Injection).
 */
export class GetWeatherByAddressUseCase {
  /**
   * @param {Object} params
   * @param {import('../services/interfaces/GeocodingServiceInterface.js').GeocodingServiceInterface} params.geocodingService
   * @param {import('../services/interfaces/WeatherServiceInterface.js').WeatherServiceInterface} params.weatherService
   */
  constructor({ geocodingService, weatherService } = {}) {
    if (!geocodingService) {
      throw new Error('GetWeatherByAddressUseCase requiert geocodingService.');
    }
    if (!weatherService) {
      throw new Error('GetWeatherByAddressUseCase requiert weatherService.');
    }

    this.geocodingService = geocodingService;
    this.weatherService = weatherService;
  }

  /**
   * Exécute le cas d'utilisation.
   * @param {string} address - L'adresse postale fournie par l'utilisateur
   * @returns {Promise<Object>}
   */
  async execute(address) {
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new ValidationError('Le paramètre "address" est obligatoire et ne peut pas être vide.');
    }

    const cleanAddress = address.trim();

    // 1. Appel du service de géocodage
    const location = await this.geocodingService.geocode(cleanAddress);

    // 2. Appel du service météo avec les coordonnées obtenues
    const forecast = await this.weatherService.getForecast(
      location.latitude,
      location.longitude
    );

    // 3. Retour du résultat consolidé
    return {
      query: cleanAddress,
      location: location.toJSON(),
      forecast: forecast.toJSON(),
    };
  }
}
