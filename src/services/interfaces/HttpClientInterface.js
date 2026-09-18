/**
 * Contrat d'interface pour un client HTTP.
 * Permet d'abstraire la librairie sous-jacente (fetch, axios, etc.).
 * Respecte le principe d'inversion des dépendances (DIP).
 */
export class HttpClientInterface {
  /**
   * Effectue une requête HTTP GET.
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  async get(url, options = {}) {
    throw new Error('La méthode get() doit être implémentée.');
  }
}
