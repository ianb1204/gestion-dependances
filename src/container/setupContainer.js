import fs from 'node:fs';
import path from 'node:path';
import { Container } from './Container.js';
import { FetchHttpClient } from '../services/http/FetchHttpClient.js';
import { NominatimGeocodingService } from '../services/geocoding/NominatimGeocodingService.js';
import { BanGeocodingService } from '../services/geocoding/BanGeocodingService.js';
import { OpenMeteoWeatherService } from '../services/weather/OpenMeteoWeatherService.js';
import { MetNorwayWeatherService } from '../services/weather/MetNorwayWeatherService.js';
import { GetWeatherByAddressUseCase } from '../usecases/GetWeatherByAddressUseCase.js';
import { WeatherController } from '../controllers/WeatherController.js';

/**
 * Charge un fichier de configuration JSON optionnel si présent (sans recompilation).
 * @returns {Object}
 */
function loadConfigFile() {
  const customPath = process.env.CONFIG_FILE;
  const targetPath = customPath
    ? path.resolve(process.cwd(), customPath)
    : path.resolve(process.cwd(), 'config.json');

  if (fs.existsSync(targetPath)) {
    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.warn(`[Config] Avertissement : impossible de parser ${targetPath} :`, err.message);
    }
  }
  return {};
}

/**
 * Configure et assemble le conteneur IoC (Composition Root).
 * C'est l'unique endroit où les implémentations concrètes sont couplées et injectées.
 * Permet le choix dynamique des fournisseurs (BAN / Nominatim, MET Norway / Open-Meteo)
 * par variable d'environnement ou fichier de configuration sans recompilation.
 * 
 * @param {Object} [overrides={}] - Permet d'injecter des mocks ou des configurations spécifiques (très utile pour les tests)
 * @returns {Container}
 */
export function setupContainer(overrides = {}) {
  const container = new Container();
  const fileConfig = loadConfigFile();

  // 1. Configuration (Priorités : overrides > process.env > config.json > valeurs par défaut)
  const config = {
    PORT: overrides.config?.PORT ?? process.env.PORT ?? fileConfig.PORT ?? fileConfig.port ?? 3000,
    GEOCODING_PROVIDER: (
      overrides.config?.GEOCODING_PROVIDER
      ?? process.env.GEOCODING_PROVIDER
      ?? fileConfig.GEOCODING_PROVIDER
      ?? fileConfig.geocodingProvider
      ?? 'ban'
    ).toString().toLowerCase(),
    WEATHER_PROVIDER: (
      overrides.config?.WEATHER_PROVIDER
      ?? process.env.WEATHER_PROVIDER
      ?? fileConfig.WEATHER_PROVIDER
      ?? fileConfig.weatherProvider
      ?? 'metnorway'
    ).toString().toLowerCase(),
    NOMINATIM_BASE_URL: overrides.config?.NOMINATIM_BASE_URL ?? process.env.NOMINATIM_BASE_URL ?? fileConfig.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
    OPEN_METEO_BASE_URL: overrides.config?.OPEN_METEO_BASE_URL ?? process.env.OPEN_METEO_BASE_URL ?? fileConfig.OPEN_METEO_BASE_URL ?? 'https://api.open-meteo.com/v1',
    BAN_BASE_URL: overrides.config?.BAN_BASE_URL ?? process.env.BAN_BASE_URL ?? fileConfig.BAN_BASE_URL ?? 'https://api-adresse.data.gouv.fr',
    MET_NORWAY_BASE_URL: overrides.config?.MET_NORWAY_BASE_URL ?? process.env.MET_NORWAY_BASE_URL ?? fileConfig.MET_NORWAY_BASE_URL ?? 'https://api.met.no/weatherapi/locationforecast/2.0',
    USER_AGENT: overrides.config?.USER_AGENT ?? process.env.USER_AGENT ?? fileConfig.USER_AGENT ?? 'TP2-MeteoApi/1.0 ian.bertin2004@gmail.com',
    HTTP_TIMEOUT: parseInt(overrides.config?.HTTP_TIMEOUT ?? process.env.HTTP_TIMEOUT ?? fileConfig.HTTP_TIMEOUT ?? '10000', 10),
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

  // 3. Enregistrement des implémentations individuelles de géocodage
  container.registerFactory('nominatimGeocodingService', (c) => {
    const cfg = c.resolve('config');
    return new NominatimGeocodingService({
      httpClient: c.resolve('httpClient'),
      baseUrl: cfg.NOMINATIM_BASE_URL,
      userAgent: cfg.USER_AGENT,
    });
  });

  container.registerFactory('banGeocodingService', (c) => {
    const cfg = c.resolve('config');
    return new BanGeocodingService({
      httpClient: c.resolve('httpClient'),
      baseUrl: cfg.BAN_BASE_URL,
      userAgent: cfg.USER_AGENT,
    });
  });

  // Résolution polymorphique du service de Géocodage selon la configuration
  if (overrides.geocodingService) {
    container.registerValue('geocodingService', overrides.geocodingService);
  } else {
    container.registerFactory('geocodingService', (c) => {
      const cfg = c.resolve('config');
      const provider = cfg.GEOCODING_PROVIDER;
      if (provider === 'nominatim' || provider === 'openstreetmap') {
        return c.resolve('nominatimGeocodingService');
      }
      return c.resolve('banGeocodingService');
    });
  }

  // 4. Enregistrement des implémentations individuelles de météo
  container.registerFactory('openMeteoWeatherService', (c) => {
    const cfg = c.resolve('config');
    return new OpenMeteoWeatherService({
      httpClient: c.resolve('httpClient'),
      baseUrl: cfg.OPEN_METEO_BASE_URL,
    });
  });

  container.registerFactory('metNorwayWeatherService', (c) => {
    const cfg = c.resolve('config');
    return new MetNorwayWeatherService({
      httpClient: c.resolve('httpClient'),
      baseUrl: cfg.MET_NORWAY_BASE_URL,
      userAgent: cfg.USER_AGENT,
    });
  });

  // Résolution polymorphique du service Météo selon la configuration
  if (overrides.weatherService) {
    container.registerValue('weatherService', overrides.weatherService);
  } else {
    container.registerFactory('weatherService', (c) => {
      const cfg = c.resolve('config');
      const provider = cfg.WEATHER_PROVIDER;
      if (provider === 'openmeteo' || provider === 'open-meteo') {
        return c.resolve('openMeteoWeatherService');
      }
      return c.resolve('metNorwayWeatherService');
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
