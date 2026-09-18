import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NominatimGeocodingService } from '../../src/services/geocoding/NominatimGeocodingService.js';
import { BanGeocodingService } from '../../src/services/geocoding/BanGeocodingService.js';
import { Location } from '../../src/domain/models/Location.js';
import { LocationNotFoundError } from '../../src/domain/errors/LocationNotFoundError.js';

/**
 * Suite de tests de contrat UNIQUE exécutée contre chaque implémentation de GeocodingServiceInterface.
 * Répond au Travail Demandé #3 et #4 du TP2 :
 * - Adresse valide
 * - Adresse introuvable
 * - Réponse vide
 * - Caractères accentués
 * - Vérification que les DTO propres à chaque API ne sortent pas de leur adaptateur.
 */
const geocodingProviders = [
  {
    providerName: 'NominatimGeocodingService (OpenStreetMap)',
    createService: (httpClient) => new NominatimGeocodingService({
      httpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    }),
    fixtures: {
      validAddress: 'Paris',
      validApiResponse: [
        {
          place_id: 1001,
          osm_id: 2002,
          osm_type: 'relation',
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Paris, Île-de-France, France',
          boundingbox: ['48.81', '48.90', '2.22', '2.46'],
          licence: 'Data © OpenStreetMap contributors',
        },
      ],
      expectedDisplayName: 'Paris, Île-de-France, France',
      expectedLatitude: 48.8566,
      expectedLongitude: 2.3522,

      notFoundApiResponse: [],
      emptyApiResponse: [],

      accentedAddress: 'Alès',
      accentedApiResponse: [
        {
          place_id: 3003,
          lat: '44.1253',
          lon: '4.0852',
          display_name: 'Alès, Gard, Occitanie, France',
        },
      ],
      expectedAccentedDisplayName: 'Alès, Gard, Occitanie, France',
      expectedAccentedLatitude: 44.1253,
      expectedAccentedLongitude: 4.0852,
    },
    // Propriétés spécifiques du DTO Nominatim à interdire hors de l'adaptateur
    dtoSpecificFields: ['place_id', 'osm_id', 'osm_type', 'licence', 'boundingbox'],
  },
  {
    providerName: 'BanGeocodingService (Base Adresse Nationale - data.gouv.fr)',
    createService: (httpClient) => new BanGeocodingService({
      httpClient,
      userAgent: 'TP2-MeteoApi/1.0 test@ecole.fr',
    }),
    fixtures: {
      validAddress: 'Paris',
      validApiResponse: {
        type: 'FeatureCollection',
        version: 'draft',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              // GeoJSON : [longitude, latitude]
              coordinates: [2.3522, 48.8566],
            },
            properties: {
              label: 'Paris',
              score: 0.98,
              id: '75056',
              name: 'Paris',
              postcode: '75001',
              citycode: '75056',
              context: '75, Paris, Île-de-France',
              type: 'municipality',
            },
          },
        ],
      },
      expectedDisplayName: 'Paris',
      expectedLatitude: 48.8566,
      expectedLongitude: 2.3522,

      notFoundApiResponse: { type: 'FeatureCollection', features: [] },
      emptyApiResponse: { type: 'FeatureCollection', features: [] },

      accentedAddress: 'Alès',
      accentedApiResponse: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [4.0852, 44.1253],
            },
            properties: {
              label: 'Alès',
              name: 'Alès',
              score: 0.95,
              postcode: '30100',
              citycode: '30007',
            },
          },
        ],
      },
      expectedAccentedDisplayName: 'Alès',
      expectedAccentedLatitude: 44.1253,
      expectedAccentedLongitude: 4.0852,
    },
    // Propriétés spécifiques du DTO BAN à interdire hors de l'adaptateur
    dtoSpecificFields: ['features', 'properties', 'geometry', 'score', 'banId', 'citycode', 'coordinates'],
  },
];

describe.each(geocodingProviders)(
  'Tests de Contrat Géocodage : $providerName',
  ({ providerName, createService, fixtures, dtoSpecificFields }) => {
    let mockHttpClient;
    let service;

    beforeEach(() => {
      mockHttpClient = {
        get: vi.fn(),
      };
      service = createService(mockHttpClient);
    });

    it('Cas 1 : Adresse valide -> retourne une instance Location conforme', async () => {
      mockHttpClient.get.mockResolvedValue(fixtures.validApiResponse);

      const location = await service.geocode(fixtures.validAddress);

      // Respect du contrat de l'entité Location
      expect(location).toBeInstanceOf(Location);
      expect(typeof location.displayName).toBe('string');
      expect(location.displayName).toBe(fixtures.expectedDisplayName);
      expect(typeof location.latitude).toBe('number');
      expect(location.latitude).toBeCloseTo(fixtures.expectedLatitude, 4);
      expect(typeof location.longitude).toBe('number');
      expect(location.longitude).toBeCloseTo(fixtures.expectedLongitude, 4);
    });

    it('Cas 2 : Adresse introuvable -> lève LocationNotFoundError', async () => {
      mockHttpClient.get.mockResolvedValue(fixtures.notFoundApiResponse);

      await expect(service.geocode('AdresseInconnueXYZ123456')).rejects.toThrow(LocationNotFoundError);
    });

    it('Cas 3 : Réponse vide -> lève LocationNotFoundError', async () => {
      mockHttpClient.get.mockResolvedValue(fixtures.emptyApiResponse);

      await expect(service.geocode('LieuVide')).rejects.toThrow(LocationNotFoundError);
    });

    it('Cas 4 : Caractères accentués -> encodage URL correct et résultat préservé', async () => {
      mockHttpClient.get.mockResolvedValue(fixtures.accentedApiResponse);

      const location = await service.geocode(fixtures.accentedAddress);

      expect(location).toBeInstanceOf(Location);
      expect(location.displayName).toBe(fixtures.expectedAccentedDisplayName);
      expect(location.latitude).toBeCloseTo(fixtures.expectedAccentedLatitude, 4);
      expect(location.longitude).toBeCloseTo(fixtures.expectedAccentedLongitude, 4);

      // Vérifie que l'URL appelée par le bouchon HTTP a correctement encodé les accents
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(fixtures.accentedAddress)),
        expect.anything()
      );
    });

    it('Cas 5 : Règle #4 du TP2 -> aucun objet propriétaire du DTO ne sort de l\'adaptateur', async () => {
      mockHttpClient.get.mockResolvedValue(fixtures.validApiResponse);

      const location = await service.geocode(fixtures.validAddress);

      // Vérifie que l'objet domaine Location ne possède QUE les champs du domaine
      const domainKeys = Object.keys(location);
      expect(domainKeys.sort()).toEqual(['displayName', 'latitude', 'longitude'].sort());

      const jsonKeys = Object.keys(location.toJSON());
      expect(jsonKeys.sort()).toEqual(['displayName', 'latitude', 'longitude'].sort());

      // Vérifie l'absence absolue de tout champ propre à l'API sous-jacente
      for (const field of dtoSpecificFields) {
        expect(location).not.toHaveProperty(field);
        expect(location.toJSON()).not.toHaveProperty(field);
      }
    });
  }
);
