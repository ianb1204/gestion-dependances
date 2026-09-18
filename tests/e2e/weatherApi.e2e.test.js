import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupContainer } from '../../src/container/setupContainer.js';
import { Location } from '../../src/domain/models/Location.js';
import { WeatherForecast } from '../../src/domain/models/WeatherForecast.js';
import { LocationNotFoundError } from '../../src/domain/errors/LocationNotFoundError.js';
import { ExternalServiceError } from '../../src/domain/errors/ExternalServiceError.js';

describe('Weather API (Tests End-to-End)', () => {
  describe('Tests E2E avec injection de services simulés (Fiabilité & Rapidité)', () => {
    it('GET /health devrait renvoyer 200 OK', async () => {
      const app = createApp();
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /weather sans paramètre address devrait renvoyer 400 Bad Request', async () => {
      const app = createApp();
      const res = await request(app).get('/weather');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/paramètre "address" est obligatoire/i);
    });

    it('GET /weather?address=Alès devrait renvoyer 200 OK avec les données météo', async () => {
      // Substitution (DI) des services externes pour le test E2E contrôlé
      const mockGeocodingService = {
        geocode: vi.fn().mockResolvedValue(
          new Location({
            displayName: 'Alès, Gard, Occitanie, France métropolitaine, France',
            latitude: 44.125,
            longitude: 4.085,
          })
        ),
      };

      const mockWeatherService = {
        getForecast: vi.fn().mockResolvedValue(
          new WeatherForecast({
            latitude: 44.125,
            longitude: 4.085,
            timezone: 'Europe/Paris',
            current: { temperature_2m: 22.4, weather_code: 0 },
            hourly: { shortwave_radiation: [120, 240] },
          })
        ),
      };

      const testContainer = setupContainer({
        geocodingService: mockGeocodingService,
        weatherService: mockWeatherService,
      });

      const app = createApp(testContainer);
      const res = await request(app).get('/weather?address=Alès');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.query).toBe('Alès');
      expect(res.body.data.location.displayName).toContain('Alès');
      expect(res.body.data.location.latitude).toBe(44.125);
      expect(res.body.data.location.longitude).toBe(4.085);
      expect(res.body.data.forecast.current.temperature_2m).toBe(22.4);
      expect(res.body.data.forecast.hourly.shortwave_radiation).toEqual([120, 240]);
    });

    it('GET /weather?address=Inconnue devrait renvoyer 404 si l\'adresse n\'existe pas', async () => {
      const mockGeocodingService = {
        geocode: vi.fn().mockRejectedValue(new LocationNotFoundError('LieuInconnu')),
      };

      const testContainer = setupContainer({
        geocodingService: mockGeocodingService,
      });

      const app = createApp(testContainer);
      const res = await request(app).get('/weather?address=LieuInconnu');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Aucun lieu trouvé');
    });

    it('GET /weather devrait renvoyer 502 si un service tiers échoue', async () => {
      const mockGeocodingService = {
        geocode: vi.fn().mockRejectedValue(new ExternalServiceError('Nominatim', 'Service temporairement indisponible')),
      };

      const testContainer = setupContainer({
        geocodingService: mockGeocodingService,
      });

      const app = createApp(testContainer);
      const res = await request(app).get('/weather?address=Montpellier');

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Nominatim');
    });

    it('GET /api/weather devrait fonctionner comme alias de /weather', async () => {
      const mockGeocodingService = {
        geocode: vi.fn().mockResolvedValue(new Location({ displayName: 'Lyon', latitude: 45.75, longitude: 4.85 })),
      };
      const mockWeatherService = {
        getForecast: vi.fn().mockResolvedValue(new WeatherForecast({ latitude: 45.75, longitude: 4.85, timezone: 'Europe/Paris' })),
      };

      const testContainer = setupContainer({
        geocodingService: mockGeocodingService,
        weatherService: mockWeatherService,
      });

      const app = createApp(testContainer);
      const res = await request(app).get('/api/weather?address=Lyon');

      expect(res.status).toBe(200);
      expect(res.body.data.query).toBe('Lyon');
    });
  });

  describe('Test E2E réel (Intégration complète avec Nominatim & Open-Meteo)', () => {
    it('devrait interroger les vraies API Nominatim et Open-Meteo pour "Alès"', async () => {
      // Ici on n'injecte aucun mock : le conteneur IoC assemble les vrais services HTTP, Nominatim et Open-Meteo
      const app = createApp();

      const res = await request(app)
        .get('/weather?address=Al%C3%A8s')
        .timeout(15000);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location.displayName).toMatch(/Al[èe]s/i);
      expect(res.body.data.location.latitude).toBeCloseTo(44.12, 1);
      expect(res.body.data.location.longitude).toBeCloseTo(4.08, 1);
      expect(res.body.data.forecast).toBeDefined();
      expect(res.body.data.forecast.hourly).toBeDefined();
      expect(res.body.data.forecast.hourly.shortwave_radiation).toBeDefined();
    }, 20000);
  });
});
