import { WeatherServiceInterface } from '../interfaces/WeatherServiceInterface.js';
import { WeatherForecast } from '../../domain/models/WeatherForecast.js';
import { ExternalServiceError } from '../../domain/errors/ExternalServiceError.js';

/**
 * Service météo utilisant l'API Open-Meteo.
 * Dépendance injectée : httpClient (respect de l'Inversion de Contrôle et DI).
 */
export class OpenMeteoWeatherService extends WeatherServiceInterface {
  /**
   * @param {Object} params
   * @param {import('../interfaces/HttpClientInterface.js').HttpClientInterface} params.httpClient
   * @param {string} [params.baseUrl]
   */
  constructor({ httpClient, baseUrl = 'https://api.open-meteo.com/v1' } = {}) {
    super();
    if (!httpClient) {
      throw new Error('OpenMeteoWeatherService requiert un httpClient injecté.');
    }
    this.httpClient = httpClient;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Récupère les prévisions météo pour les coordonnées spécifiées.
   * @param {number} latitude
   * @param {number} longitude
   * @param {Object} [options]
   * @param {string} [options.hourly] - Variables horaires (ex: 'shortwave_radiation,temperature_2m')
   * @param {string} [options.current] - Variables actuelles (ex: 'temperature_2m,weather_code,wind_speed_10m')
   * @returns {Promise<WeatherForecast>}
   */
  async getForecast(latitude, longitude, options = {}) {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw new TypeError('La latitude doit être un nombre valide.');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw new TypeError('La longitude doit être un nombre valide.');
    }

    const hourlyParams = options.hourly || 'shortwave_radiation,temperature_2m';
    const currentParams = options.current || 'temperature_2m,weather_code,wind_speed_10m';

    const queryParams = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: hourlyParams,
      current: currentParams,
    });

    const url = `${this.baseUrl}/forecast?${queryParams.toString()}`;

    let data;
    try {
      data = await this.httpClient.get(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      throw new ExternalServiceError('Open-Meteo', err.message, err.status);
    }

    if (!data || typeof data !== 'object') {
      throw new ExternalServiceError('Open-Meteo', 'Réponse invalide reçue.');
    }

    // Normalisation vers le modèle de domaine WeatherForecast sans fuite du DTO brut
    const current = data.current ? {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      temperature_2m: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      weather_code: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      wind_speed_10m: data.current.wind_speed_10m,
    } : null;

    const hourly = data.hourly ? {
      time: data.hourly.time || [],
      temperature: data.hourly.temperature_2m || [],
      temperature_2m: data.hourly.temperature_2m || [],
      shortwave_radiation: data.hourly.shortwave_radiation || [],
      windSpeed: data.hourly.wind_speed_10m || [],
      wind_speed_10m: data.hourly.wind_speed_10m || [],
    } : null;

    return new WeatherForecast({
      latitude: data.latitude ?? latitude,
      longitude: data.longitude ?? longitude,
      timezone: data.timezone || 'UTC',
      current,
      hourly,
    });
  }
}
