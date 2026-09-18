import { describe, it, expect, vi } from 'vitest';
import { MetNorwayWeatherService } from '../../src/services/weather/MetNorwayWeatherService.js';
import { WeatherForecast } from '../../src/domain/models/WeatherForecast.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';

describe('MetNorwayWeatherService (Tests unitaires)', () => {
  it('devrait lever une erreur si httpClient n\'est pas injecté', () => {
    expect(() => new MetNorwayWeatherService()).toThrow('requiert un httpClient injecté');
  });

  it('devrait lever une erreur si userAgent est manquant ou vide', () => {
    const mockHttpClient = { get: vi.fn() };
    expect(() => new MetNorwayWeatherService({ httpClient: mockHttpClient, userAgent: '' })).toThrow('User-Agent identifiable obligatoire');
    expect(() => new MetNorwayWeatherService({ httpClient: mockHttpClient, userAgent: '   ' })).toThrow('User-Agent identifiable obligatoire');
  });

  it('devrait récupérer avec succès les prévisions météo via MET Norway', async () => {
    const mockApiResponse = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [4.08, 44.12, 122],
      },
      properties: {
        meta: {
          units: { air_temperature: 'celsius' },
        },
        timeseries: [
          {
            time: '2026-09-18T14:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 26.5,
                  wind_speed: 4.2,
                  relative_humidity: 32.0,
                  air_pressure_at_sea_level: 1015.0,
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
                  air_temperature: 25.8,
                  wind_speed: 4.0,
                },
              },
            },
          },
        ],
      },
    };

    const mockHttpClient = {
      get: vi.fn().mockResolvedValue(mockApiResponse),
    };

    const service = new MetNorwayWeatherService({
      httpClient: mockHttpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    });

    const forecast = await service.getForecast(44.12, 4.08);

    expect(forecast).toBeInstanceOf(WeatherForecast);
    expect(forecast.latitude).toBe(44.12);
    expect(forecast.longitude).toBe(4.08);
    expect(forecast.current.temperature).toBe(26.5);
    expect(forecast.current.temperature_2m).toBe(26.5);
    expect(forecast.current.windSpeed).toBe(4.2);
    expect(forecast.current.weatherCode).toBe('clearsky_day');
    expect(forecast.hourly.time).toHaveLength(2);
    expect(forecast.hourly.temperature).toEqual([26.5, 25.8]);

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/compact?lat=44.12&lon=4.08'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'TP2-MeteoApi/1.0 test@ecole.fr',
        }),
      })
    );
  });

  it('devrait lever une TypeError si les coordonnées ne sont pas des nombres', async () => {
    const mockHttpClient = { get: vi.fn() };
    const service = new MetNorwayWeatherService({
      httpClient: mockHttpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    });

    await expect(service.getForecast('invalide', 4.08)).rejects.toThrow(TypeError);
    await expect(service.getForecast(44.12, NaN)).rejects.toThrow(TypeError);
  });

  it('devrait lever ExternalServiceError si le service MET Norway échoue', async () => {
    const mockHttpClient = {
      get: vi.fn().mockRejectedValue(new Error('Erreur HTTP 403 Forbidden')),
    };

    const service = new MetNorwayWeatherService({
      httpClient: mockHttpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    });

    await expect(service.getForecast(44.12, 4.08)).rejects.toThrow(ExternalServiceError);
  });
});
