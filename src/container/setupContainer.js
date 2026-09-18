import { Container } from './Container.js';
import { FetchHttpClient } from '../services/http/FetchHttpClient.js';
import { NominatimGeocodingService } from '../services/geocoding/NominatimGeocodingService.js';
import { OpenMeteoWeatherService } from '../services/weather/OpenMeteoWeatherService.js';
import { GetWeatherByAddressUseCase } from '../usecases/GetWeatherByAddressUseCase.js';
import { WeatherController } from '../controllers/WeatherController.js';

/**
 * Configure et assemble le conteneur IoC (Composition Root).
 * C'est l'unique endroit où les implémentations concrètes sont couplées et injectées.
 * 
 * @param {Object} [overrides={}] - Permet d'injecter des mocks ou des configurations spécifiques (très utile pour les tests)
 * @returns {Container}
 */
export function setupContainer(overrides = {}) {
  const container = new Container();

  // 1. Configuration
  const config = {
    PORT: process.env.PORT || 3000,
    NOMINATIM_BASE_URL: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
    OPEN_METEO_BASE_URL: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1',
    USER_AGENT: process.env.USER_AGENT || 'WeatherApp/1.0 (TP-Gestion-Dependances)',
    HTTP_TIMEOUT: parseInt(process.env.HTTP_TIMEOUT || '10000', 10),
    ...(overrides.config || {}),
  };
  container.registerValue('config', config);

  // 2. Client HTTP
  if (overrides.httpClient) {
    container.registerValue('httpClient', overrides.httpClient);
  } else {
    container.registerFactory('httpClient', (c) => {
      const cfg = c.resolve('config');
      return new FetchHttpClient({ timeout: cfg.HTTP_TIMEOUT });
    });
  }

  // 3. Service de Géocodage
  if (overrides.geocodingService) {
    container.registerValue('geocodingService', overrides.geocodingService);
  } else {
    container.registerFactory('geocodingService', (c) => {
      const cfg = c.resolve('config');
      return new NominatimGeocodingService({
        httpClient: c.resolve('httpClient'),
        baseUrl: cfg.NOMINATIM_BASE_URL,
        userAgent: cfg.USER_AGENT,
      });
    });
  }

  // 4. Service Météo
  if (overrides.weatherService) {
    container.registerValue('weatherService', overrides.weatherService);
  } else {
    container.registerFactory('weatherService', (c) => {
      const cfg = c.resolve('config');
      return new OpenMeteoWeatherService({
        httpClient: c.resolve('httpClient'),
        baseUrl: cfg.OPEN_METEO_BASE_URL,
      });
    });
  }

  // 5. Cas d'utilisation (Use Case)
  if (overrides.getWeatherByAddressUseCase) {
    container.registerValue('getWeatherByAddressUseCase', overrides.getWeatherByAddressUseCase);
  } else {
    container.registerFactory('getWeatherByAddressUseCase', (c) => {
      return new GetWeatherByAddressUseCase({
        geocodingService: c.resolve('geocodingService'),
        weatherService: c.resolve('weatherService'),
      });
    });
  }

  // 6. Contrôleur HTTP
  if (overrides.weatherController) {
    container.registerValue('weatherController', overrides.weatherController);
  } else {
    container.registerFactory('weatherController', (c) => {
      return new WeatherController({
        getWeatherByAddressUseCase: c.resolve('getWeatherByAddressUseCase'),
      });
    });
  }

  return container;
}
