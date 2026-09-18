import { describe, it, expect, vi } from 'vitest';
import { NominatimGeocodingService } from '../../src/services/geocoding/NominatimGeocodingService.js';
import { LocationNotFoundError } from '../../src/domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';
import { Location } from '../../src/domain/models/Location.js';

describe('NominatimGeocodingService (Tests unitaires)', () => {
  it('devrait lever une erreur si httpClient n\'est pas injecté', () => {
    expect(() => new NominatimGeocodingService()).toThrow('requiert un httpClient injecté');
  });

  it('devrait géocoder avec succès une adresse valide', async () => {
    // Dépendance HTTP simulée (Mock)
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue([
        {
          place_id: 12345,
          lat: '44.1253665',
          lon: '4.0852818',
          display_name: 'Alès, Gard, Occitanie, France métropolitaine, France',
        },
      ]),
    };

    const service = new NominatimGeocodingService({
      httpClient: mockHttpClient,
      userAgent: 'TestAgent/1.0',
    });

    const location = await service.geocode('Alès');

    expect(location).toBeInstanceOf(Location);
    expect(location.latitude).toBeCloseTo(44.1253665);
    expect(location.longitude).toBeCloseTo(4.0852818);
    expect(location.displayName).toBe('Alès, Gard, Occitanie, France métropolitaine, France');

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=Al%C3%A8s&format=json'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'TestAgent/1.0',
        }),
      })
    );
  });

  it('devrait lever LocationNotFoundError si Nominatim renvoie un tableau vide', async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue([]),
    };

    const service = new NominatimGeocodingService({
      httpClient: mockHttpClient,
    });

    await expect(service.geocode('LieuTotalementInexistantXYZ12345')).rejects.toThrow(LocationNotFoundError);
  });

  it('devrait lever LocationNotFoundError si l\'adresse est vide ou non renseignée', async () => {
    const mockHttpClient = {
      get: vi.fn(),
    };

    const service = new NominatimGeocodingService({ httpClient: mockHttpClient });

    await expect(service.geocode('')).rejects.toThrow(LocationNotFoundError);
    await expect(service.geocode('   ')).rejects.toThrow(LocationNotFoundError);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it('devrait lever ExternalServiceError si le client HTTP échoue', async () => {
    const mockHttpClient = {
      get: vi.fn().mockRejectedValue(new Error('Connexion réseau refusée')),
    };

    const service = new NominatimGeocodingService({
      httpClient: mockHttpClient,
    });

    await expect(service.geocode('Paris')).rejects.toThrow(ExternalServiceError);
  });
});
