import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenMeteoWeatherService } from '../../src/services/weather/OpenMeteoWeatherService.js';
import { MetNorwayWeatherService } from '../../src/services/weather/MetNorwayWeatherService.js';
import { WeatherForecast } from '../../src/domain/models/WeatherForecast.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';

/**
 * Suite de tests de contrat UNIQUE exécutée contre chaque implémentation de WeatherServiceInterface.
 * Répond au Travail Demandé #3 et #4 du TP2 pour la couche météo :
 * - Coordonnées valides (réponse simulée par bouchon HTTP)
 * - Coordonnées invalides
 * - Erreur service externe
 * - Vérification que les objets propres à chaque API (DTO, noms de champs, formats) ne sortent pas de leur adaptateur.
 */
const weatherProviders = [
  {
    providerName: 'OpenMeteoWeatherService (Open-Meteo API)',
    createService: (httpClient) => new OpenMeteoWeatherService({ httpClient }),
    validApiResponse: {
      latitude: 44.12,
      longitude: 4.08,
      timezone: 'Europe/Paris',
      current: {
        time: '2026-09-18T14:00',
        temperature_2m: 24.5,
        weather_code: 1,
        wind_speed_10m: 11.2,
      },
      hourly: {
        time: ['2026-09-18T14:00', '2026-09-18T15:00'],
        temperature_2m: [24.5, 23.8],
        shortwave_radiation: [150, 100],
        wind_speed_10m: [11.2, 10.5],
      },
    },
    // Propriétés spécifiques du DTO Open-Meteo à interdire sur le modèle de domaine racine
    dtoSpecificFields: ['generationtime_ms', 'utc_offset_seconds', 'elevation'],
  },
  {
    providerName: 'MetNorwayWeatherService (MET Norway Locationforecast API)',
    createService: (httpClient) => new MetNorwayWeatherService({
      httpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    }),
    validApiResponse: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [4.08, 44.12, 122],
      },
      properties: {
        meta: {
          updated_at: '2026-09-18T13:00:00Z',
          units: { air_temperature: 'celsius' },
        },
        timeseries: [
          {
            time: '2026-09-18T14:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 24.5,
                  wind_speed: 11.2,
                  relative_humidity: 35.0,
                  air_pressure_at_sea_level: 1016.0,
                },
              },
              next_1_hours: {
                summary: { symbol_code: 'clearsky_day' },
                details: { precipitation_amount: 0 },
              },
            },
          },
          {
            time: '2026-09-18T15:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 23.8,
                  wind_speed: 10.5,
                },
              },
            },
          },
        ],
      },
    },
    // Propriétés spécifiques du DTO MET Norway à interdire sur le modèle de domaine racine
    dtoSpecificFields: ['type', 'geometry', 'properties', 'timeseries', 'meta'],
  },
];

describe.each(weatherProviders)(
  'Tests de Contrat Météo : $providerName',
  ({ providerName, createService, validApiResponse, dtoSpecificFields }) => {
    let mockHttpClient;
    let service;

    beforeEach(() => {
      mockHttpClient = {
        get: vi.fn(),
      };
      service = createService(mockHttpClient);
    });

    it('Cas 1 : Coordonnées valides -> retourne une instance de WeatherForecast normalisée', async () => {
      mockHttpClient.get.mockResolvedValue(validApiResponse);

      const forecast = await service.getForecast(44.12, 4.08);

      // Vérification du contrat WeatherForecast
      expect(forecast).toBeInstanceOf(WeatherForecast);
      expect(typeof forecast.latitude).toBe('number');
      expect(forecast.latitude).toBeCloseTo(44.12);
      expect(typeof forecast.longitude).toBe('number');
      expect(forecast.longitude).toBeCloseTo(4.08);
      expect(typeof forecast.timezone).toBe('string');

      // Vérification des données actuelles normalisées
      expect(forecast.current).toBeDefined();
      expect(typeof forecast.current.temperature).toBe('number');
      expect(forecast.current.temperature).toBeCloseTo(24.5);
      expect(typeof forecast.current.temperature_2m).toBe('number'); // Alias unifié
      expect(typeof forecast.current.windSpeed).toBe('number');
      expect(forecast.current.windSpeed).toBeCloseTo(11.2);

      // Vérification des données horaires
      expect(forecast.hourly).toBeDefined();
      expect(Array.isArray(forecast.hourly.time)).toBe(true);
      expect(Array.isArray(forecast.hourly.temperature)).toBe(true);
      expect(forecast.hourly.temperature[0]).toBeCloseTo(24.5);
    });

    it('Cas 2 : Coordonnées invalides -> lève TypeError', async () => {
      await expect(service.getForecast('invalide', 4.08)).rejects.toThrow(TypeError);
      await expect(service.getForecast(44.12, NaN)).rejects.toThrow(TypeError);
      await expect(service.getForecast(null, 4.08)).rejects.toThrow(TypeError);
    });

    it('Cas 3 : Erreur HTTP du service distant -> lève ExternalServiceError', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Service indisponible (503)'));

      await expect(service.getForecast(44.12, 4.08)).rejects.toThrow(ExternalServiceError);
    });

    it('Cas 4 : Règle #4 du TP2 -> aucun DTO propriétaire ne sort de l\'adaptateur', async () => {
      mockHttpClient.get.mockResolvedValue(validApiResponse);

      const forecast = await service.getForecast(44.12, 4.08);

      // Le modèle de domaine WeatherForecast ne doit posséder QUE les champs du domaine
      const domainKeys = Object.keys(forecast);
      expect(domainKeys.sort()).toEqual(['latitude', 'longitude', 'timezone', 'current', 'hourly'].sort());

      const jsonKeys = Object.keys(forecast.toJSON());
      expect(jsonKeys.sort()).toEqual(['latitude', 'longitude', 'timezone', 'current', 'hourly'].sort());

      // Aucun champ spécifique de l'API externe ne doit être attaché à la racine du modèle
      for (const field of dtoSpecificFields) {
        expect(forecast).not.toHaveProperty(field);
        expect(forecast.toJSON()).not.toHaveProperty(field);
      }

      // Aucun champ brut n'est exposé
      expect(forecast).not.toHaveProperty('raw');
    });
  }
);
