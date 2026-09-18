import { describe, it, expect, vi } from 'vitest';
import { GetWeatherByAddressUseCase } from '../../src/usecases/GetWeatherByAddressUseCase.js';
import { ValidationError } from '../../src/domain/errors/ValidationError.js';
import { LocationNotFoundError } from '../../src/domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';
import { Location } from '../../src/domain/models/Location.js';
import { WeatherForecast } from '../../src/domain/models/WeatherForecast.js';

describe('GetWeatherByAddressUseCase (Tests unitaires)', () => {
  it('devrait lever une exception si les dépendances obligatoires ne sont pas injectées', () => {
    expect(() => new GetWeatherByAddressUseCase()).toThrow('requiert geocodingService');
    expect(() => new GetWeatherByAddressUseCase({ geocodingService: {} })).toThrow('requiert weatherService');
  });

  it('devrait orchestrer le géocodage et la météo avec succès', async () => {
    // 1. Mocks des services injectés
    const mockLocation = new Location({
      displayName: 'Alès, Occitanie, France',
      latitude: 44.125,
      longitude: 4.085,
    });

    const mockForecast = new WeatherForecast({
      latitude: 44.125,
      longitude: 4.085,
      timezone: 'Europe/Paris',
      current: { temperature_2m: 21 },
      hourly: { shortwave_radiation: [100, 200] },
    });

    const mockGeocodingService = {
      geocode: vi.fn().mockResolvedValue(mockLocation),
    };

    const mockWeatherService = {
      getForecast: vi.fn().mockResolvedValue(mockForecast),
    };

    // 2. Instanciation du use case par injection de dépendances
    const useCase = new GetWeatherByAddressUseCase({
      geocodingService: mockGeocodingService,
      weatherService: mockWeatherService,
    });

    // 3. Exécution
    const result = await useCase.execute('Alès');

    // 4. Vérifications
    expect(mockGeocodingService.geocode).toHaveBeenCalledWith('Alès');
    expect(mockWeatherService.getForecast).toHaveBeenCalledWith(44.125, 4.085);

    expect(result).toEqual({
      query: 'Alès',
      location: {
        displayName: 'Alès, Occitanie, France',
        latitude: 44.125,
        longitude: 4.085,
      },
      forecast: {
        latitude: 44.125,
        longitude: 4.085,
        timezone: 'Europe/Paris',
        current: { temperature_2m: 21 },
        hourly: { shortwave_radiation: [100, 200] },
      },
    });
  });

  it('devrait lever une ValidationError si l\'adresse est manquante ou vide', async () => {
    const mockGeocodingService = { geocode: vi.fn() };
    const mockWeatherService = { getForecast: vi.fn() };

    const useCase = new GetWeatherByAddressUseCase({
      geocodingService: mockGeocodingService,
      weatherService: mockWeatherService,
    });

    await expect(useCase.execute('')).rejects.toThrow(ValidationError);
    await expect(useCase.execute('   ')).rejects.toThrow(ValidationError);
    await expect(useCase.execute(null)).rejects.toThrow(ValidationError);
    await expect(useCase.execute(undefined)).rejects.toThrow(ValidationError);

    expect(mockGeocodingService.geocode).not.toHaveBeenCalled();
    expect(mockWeatherService.getForecast).not.toHaveBeenCalled();
  });

  it('devrait propager l\'erreur LocationNotFoundError si l\'adresse n\'existe pas', async () => {
    const mockGeocodingService = {
      geocode: vi.fn().mockRejectedValue(new LocationNotFoundError('VilleInconnue')),
    };
    const mockWeatherService = { getForecast: vi.fn() };

    const useCase = new GetWeatherByAddressUseCase({
      geocodingService: mockGeocodingService,
      weatherService: mockWeatherService,
    });

    await expect(useCase.execute('VilleInconnue')).rejects.toThrow(LocationNotFoundError);
    expect(mockWeatherService.getForecast).not.toHaveBeenCalled();
  });

  it('devrait propager l\'erreur ExternalServiceError si le service météo échoue', async () => {
    const mockLocation = new Location({
      displayName: 'Paris',
      latitude: 48.85,
      longitude: 2.35,
    });

    const mockGeocodingService = {
      geocode: vi.fn().mockResolvedValue(mockLocation),
    };
    const mockWeatherService = {
      getForecast: vi.fn().mockRejectedValue(new ExternalServiceError('Open-Meteo', 'Timeout')),
    };

    const useCase = new GetWeatherByAddressUseCase({
      geocodingService: mockGeocodingService,
      weatherService: mockWeatherService,
    });

    await expect(useCase.execute('Paris')).rejects.toThrow(ExternalServiceError);
  });
});
