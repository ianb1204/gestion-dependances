import { describe, it, expect, vi } from 'vitest';
import { OpenMeteoWeatherService } from '../../src/services/weather/OpenMeteoWeatherService.js';
import { WeatherForecast } from '../../src/domain/models/WeatherForecast.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';

describe('OpenMeteoWeatherService (Tests unitaires)', () => {
  it('devrait lever une erreur si httpClient n\'est pas injecté', () => {
    expect(() => new OpenMeteoWeatherService()).toThrow('requiert un httpClient injecté');
  });

  it('devrait récupérer avec succès les prévisions météo pour des coordonnées', async () => {
    const mockApiResponse = {
      latitude: 48.85,
      longitude: 2.35,
      timezone: 'Europe/Paris',
      current: {
        time: '2026-09-18T12:00',
        temperature_2m: 18.5,
        weather_code: 1,
        wind_speed_10m: 12.0,
      },
      hourly: {
        time: ['2026-09-18T00:00', '2026-09-18T01:00'],
        temperature_2m: [15.2, 14.8],
        shortwave_radiation: [0, 0],
      },
    };

    const mockHttpClient = {
      get: vi.fn().mockResolvedValue(mockApiResponse),
    };

    const service = new OpenMeteoWeatherService({
      httpClient: mockHttpClient,
    });

    const forecast = await service.getForecast(48.85, 2.35);

    expect(forecast).toBeInstanceOf(WeatherForecast);
    expect(forecast.latitude).toBe(48.85);
    expect(forecast.longitude).toBe(2.35);
    expect(forecast.current.temperature_2m).toBe(18.5);
    expect(forecast.hourly.shortwave_radiation).toEqual([0, 0]);

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('latitude=48.85'),
      expect.anything()
    );
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('longitude=2.35'),
      expect.anything()
    );
    // Vérification de la variable hourly shortwave_radiation spécifiée dans l'exemple du TP
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('shortwave_radiation'),
      expect.anything()
    );
  });

  it('devrait lever une TypeError si les coordonnées ne sont pas des nombres', async () => {
    const mockHttpClient = { get: vi.fn() };
    const service = new OpenMeteoWeatherService({ httpClient: mockHttpClient });

    await expect(service.getForecast('invalide', 2.35)).rejects.toThrow(TypeError);
    await expect(service.getForecast(48.85, NaN)).rejects.toThrow(TypeError);
  });

  it('devrait lever ExternalServiceError si le service météo distant échoue', async () => {
    const mockHttpClient = {
      get: vi.fn().mockRejectedValue(new Error('Open-Meteo indisponible')),
    };

    const service = new OpenMeteoWeatherService({ httpClient: mockHttpClient });

    await expect(service.getForecast(48.85, 2.35)).rejects.toThrow(ExternalServiceError);
  });
});
