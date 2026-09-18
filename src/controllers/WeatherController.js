/**
 * Contrôleur HTTP pour les requêtes météo.
 * Reçoit la requête GET, extrait les paramètres et délègue l'exécution au use case.
 * Dépendance injectée : getWeatherByAddressUseCase (Inversion de Contrôle et DI).
 */
export class WeatherController {
  /**
   * @param {Object} params
   * @param {import('../usecases/GetWeatherByAddressUseCase.js').GetWeatherByAddressUseCase} params.getWeatherByAddressUseCase
   */
  constructor({ getWeatherByAddressUseCase } = {}) {
    if (!getWeatherByAddressUseCase) {
      throw new Error('WeatherController requiert getWeatherByAddressUseCase.');
    }
    this.getWeatherByAddressUseCase = getWeatherByAddressUseCase;
    
    // Bind pour assurer le bon contexte dans les middlewares Express
    this.getWeather = this.getWeather.bind(this);
  }

  /**
   * Gestionnaire pour GET /weather ou GET /api/weather
   * Reçoit une adresse en paramètre GET (ex: ?address=Alès ou ?q=Alès)
   */
  async getWeather(req, res, next) {
    try {
      // Supporte ?address=... ou ?q=... pour plus de flexibilité
      const address = req.query.address || req.query.q;

      const result = await this.getWeatherByAddressUseCase.execute(address);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
