import { describe, it, expect, vi } from 'vitest';
import { BanGeocodingService } from '../../src/services/geocoding/BanGeocodingService.js';
import { LocationNotFoundError } from '../../src/domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';
import { Location } from '../../src/domain/models/Location.js';

describe('BanGeocodingService (Tests unitaires)', () => {
  it('devrait lever une erreur si httpClient n\'est pas injecté', () => {
    expect(() => new BanGeocodingService()).toThrow('requiert un httpClient injecté');
  });

  it('devrait géocoder avec succès une adresse valide via l\'API BAN', async () => {
    const mockApiResponse = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            // Format GeoJSON : [longitude, latitude]
            coordinates: [4.089242, 44.125356],
          },
          properties: {
            label: 'Alès',
            score: 0.95,
            id: '30007',
            citycode: '30007',
            city: 'Alès',
            context: '30, Gard, Occitanie',
          },
        },
      ],
    };

    const mockHttpClient = {
      get: vi.fn().mockResolvedValue(mockApiResponse),
    };

    const service = new BanGeocodingService({
      httpClient: mockHttpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    });

    const location = await service.geocode('Alès');

    expect(location).toBeInstanceOf(Location);
    expect(location.displayName).toBe('Alès');
    expect(location.latitude).toBeCloseTo(44.125356);
    expect(location.longitude).toBeCloseTo(4.089242);

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/search/?q=Al%C3%A8s&limit=1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'TP2-MeteoApi/1.0 test@ecole.fr',
        }),
      })
    );
  });

  it('devrait lever LocationNotFoundError si BAN renvoie features vide', async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [],
      }),
    };

    const service = new BanGeocodingService({ httpClient: mockHttpClient });

    await expect(service.geocode('AdresseInexistante99999')).rejects.toThrow(LocationNotFoundError);
  });

  it('devrait lever LocationNotFoundError si l\'adresse est vide ou non renseignée', async () => {
    const mockHttpClient = { get: vi.fn() };
    const service = new BanGeocodingService({ httpClient: mockHttpClient });

    await expect(service.geocode('')).rejects.toThrow(LocationNotFoundError);
    await expect(service.geocode('   ')).rejects.toThrow(LocationNotFoundError);
    await expect(service.geocode(null)).rejects.toThrow(LocationNotFoundError);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it('devrait lever ExternalServiceError si le client HTTP échoue', async () => {
    const mockHttpClient = {
      get: vi.fn().mockRejectedValue(new Error('Réseau indisponible')),
    };

    const service = new BanGeocodingService({ httpClient: mockHttpClient });

    await expect(service.geocode('Paris')).rejects.toThrow(ExternalServiceError);
  });

  it('devrait lever ExternalServiceError si les coordonnées retournées sont invalides', async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { coordinates: ['invalide', 'invalide'] },
            properties: { label: 'Paris' },
          },
        ],
      }),
    };

    const service = new BanGeocodingService({ httpClient: mockHttpClient });

    await expect(service.geocode('Paris')).rejects.toThrow(ExternalServiceError);
  });
});
