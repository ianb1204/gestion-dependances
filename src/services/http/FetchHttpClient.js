import { HttpClientInterface } from '../interfaces/HttpClientInterface.js';

/**
 * Implémentation de HttpClientInterface basée sur le fetch natif de Node.js.
 */
export class FetchHttpClient extends HttpClientInterface {
  /**
   * @param {Object} [options]
   * @param {number} [options.timeout=10000] - Délai d'expiration en ms
   * @param {Object} [options.defaultHeaders={}]
   */
  constructor({ timeout = 10000, defaultHeaders = {} } = {}) {
    super();
    this.timeout = timeout;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * @param {string} url
   * @param {Object} [options]
   * @param {Object} [options.headers]
   * @param {number} [options.timeout]
   * @returns {Promise<any>}
   */
  async get(url, options = {}) {
    const controller = new AbortController();
    const timeoutDuration = options.timeout ?? this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error = new Error(`HTTP ${response.status} ${response.statusText}${errorText ? ` : ${errorText}` : ''}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Délai d'attente dépassé (${timeoutDuration}ms) lors de l'appel à ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
