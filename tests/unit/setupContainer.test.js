import { describe, it, expect } from 'vitest';
import { setupContainer } from '../../src/container/setupContainer.js';
import { BanGeocodingService } from '../../src/services/geocoding/BanGeocodingService.js';
import { NominatimGeocodingService } from '../../src/services/geocoding/NominatimGeocodingService.js';
import { MetNorwayWeatherService } from '../../src/services/weather/MetNorwayWeatherService.js';
import { OpenMeteoWeatherService } from '../../src/services/weather/OpenMeteoWeatherService.js';

describe('setupContainer & Configuration (Tests unitaires)', () => {
  it('devrait résoudre BAN et MET Norway par défaut (exigence client TP2)', () => {
    const container = setupContainer();

    const geocoding = container.resolve('geocodingService');
    const weather = container.resolve('weatherService');

    expect(geocoding).toBeInstanceOf(BanGeocodingService);
    expect(weather).toBeInstanceOf(MetNorwayWeatherService);
  });

  it('devrait basculer vers Nominatim lorsque GEOCODING_PROVIDER="nominatim"', () => {
    const container = setupContainer({
      config: { GEOCODING_PROVIDER: 'nominatim' },
    });

    const geocoding = container.resolve('geocodingService');
    expect(geocoding).toBeInstanceOf(NominatimGeocodingService);
  });

  it('devrait basculer vers Open-Meteo lorsque WEATHER_PROVIDER="openmeteo"', () => {
    const container = setupContainer({
      config: { WEATHER_PROVIDER: 'openmeteo' },
    });

    const weather = container.resolve('weatherService');
    expect(weather).toBeInstanceOf(OpenMeteoWeatherService);
  });

  it('devrait conserver tous les anciens et nouveaux fournisseurs disponibles individuellement dans le conteneur', () => {
    const container = setupContainer();

    expect(container.resolve('banGeocodingService')).toBeInstanceOf(BanGeocodingService);
    expect(container.resolve('nominatimGeocodingService')).toBeInstanceOf(NominatimGeocodingService);
    expect(container.resolve('metNorwayWeatherService')).toBeInstanceOf(MetNorwayWeatherService);
    expect(container.resolve('openMeteoWeatherService')).toBeInstanceOf(OpenMeteoWeatherService);
  });

  it('devrait permettre de surcharger les services via les overrides du conteneur', () => {
    const mockGeocoding = { geocode: () => ({ displayName: 'Mock' }) };
    const container = setupContainer({ geocodingService: mockGeocoding });

    expect(container.resolve('geocodingService')).toBe(mockGeocoding);
  });
});
