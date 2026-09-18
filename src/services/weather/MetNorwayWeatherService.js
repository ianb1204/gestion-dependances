import { WeatherServiceInterface } from '../interfaces/WeatherServiceInterface.js';
import { WeatherForecast } from '../../domain/models/WeatherForecast.js';
import { ExternalServiceError } from '../../domain/errors/ExternalServiceError.js';

/**
 * Service météo utilisant l'API MET Norway (Locationforecast 2.0 compact).
 * Fournisseur météorologique officiel norvégien (ouvert et mondial).
 * Dépendance injectée : httpClient (respect de l'Inversion de Contrôle et DI).
 */
export class MetNorwayWeatherService extends WeatherServiceInterface {
  /**
   * @param {Object} params
   * @param {import('../interfaces/HttpClientInterface.js').HttpClientInterface} params.httpClient
   * @param {string} [params.baseUrl]
   * @param {string} [params.userAgent]
   */
  constructor({
    httpClient,
    baseUrl = 'https://api.met.no/weatherapi/locationforecast/2.0',
    userAgent = 'TP2-MeteoApi/1.0 ian.bertin2004@gmail.com',
  } = {}) {
    super();
    if (!httpClient) {
      throw new Error('MetNorwayWeatherService requiert un httpClient injecté.');
    }
    if (!userAgent || !userAgent.trim()) {
      throw new Error('MetNorwayWeatherService requiert un User-Agent identifiable obligatoire.');
    }

    this.httpClient = httpClient;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.userAgent = userAgent.trim();
  }

  /**
   * Récupère les prévisions météo pour les coordonnées spécifiées via MET Norway.
   * @param {number} latitude
   * @param {number} longitude
   * @param {Object} [options]
   * @returns {Promise<WeatherForecast>}
   */
  async getForecast(latitude, longitude, options = {}) {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw new TypeError('La latitude doit être un nombre valide.');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw new TypeError('La longitude doit être un nombre valide.');
    }

    // MET Norway recommande d'arrondir les coordonnées à 4 décimales maximum
    const roundedLat = Math.round(latitude * 10000) / 10000;
    const roundedLon = Math.round(longitude * 10000) / 10000;

    const url = `${this.baseUrl}/compact?lat=${roundedLat}&lon=${roundedLon}`;

    let data;
    try {
      data = await this.httpClient.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      throw new ExternalServiceError('MET Norway', err.message, err.status);
    }

    if (!data || typeof data !== 'object' || !data.properties || !Array.isArray(data.properties.timeseries) || data.properties.timeseries.length === 0) {
      throw new ExternalServiceError('MET Norway', 'Réponse invalide reçue de MET Norway.');
    }

    const timeseries = data.properties.timeseries;
    const currentEntry = timeseries[0];
    const instantDetails = currentEntry?.data?.instant?.details || {};

    // Symbol code météo (ex: clearsky_day, cloudy, rain...)
    const weatherSymbol = currentEntry?.data?.next_1_hours?.summary?.symbol_code
      || currentEntry?.data?.next_6_hours?.summary?.symbol_code
      || currentEntry?.data?.next_12_hours?.summary?.symbol_code
      || 'unknown';

    // Normalisation des données actuelles dans le modèle de domaine (sans fuite du DTO MET Norway)
    const current = {
      time: currentEntry?.time || new Date().toISOString(),
      temperature: instantDetails.air_temperature ?? null,
      temperature_2m: instantDetails.air_temperature ?? null, // Alias pour compatibilité unifiée
      weatherCode: weatherSymbol,
      weather_code: weatherSymbol,
      windSpeed: instantDetails.wind_speed ?? null,
      wind_speed_10m: instantDetails.wind_speed ?? null,
      humidity: instantDetails.relative_humidity ?? null,
      pressure: instantDetails.air_pressure_at_sea_level ?? null,
      summary: weatherSymbol,
    };

    // Normalisation des données horaires (24 premières heures)
    const hourlyTimes = [];
    const hourlyTemperatures = [];
    const hourlyWindSpeeds = [];

    const hoursLimit = Math.min(timeseries.length, 24);
    for (let i = 0; i < hoursLimit; i++) {
      const entry = timeseries[i];
      hourlyTimes.push(entry.time);
      hourlyTemperatures.push(entry.data?.instant?.details?.air_temperature ?? null);
      hourlyWindSpeeds.push(entry.data?.instant?.details?.wind_speed ?? null);
    }

    const hourly = {
      time: hourlyTimes,
      temperature: hourlyTemperatures,
      temperature_2m: hourlyTemperatures,
      windSpeed: hourlyWindSpeeds,
      wind_speed_10m: hourlyWindSpeeds,
      shortwave_radiation: hourlyTimes.map(() => null),
    };

    return new WeatherForecast({
      latitude,
      longitude,
      timezone: 'UTC',
      current,
      hourly,
    });
  }
}
