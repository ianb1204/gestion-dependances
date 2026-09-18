import express from 'express';
import { setupContainer } from './container/setupContainer.js';
import { AppError } from './domain/errors/AppError.js';

/**
 * Crée et configure l'application Express en injectant le conteneur IoC.
 * @param {import('./container/Container.js').Container} [container]
 * @returns {express.Express}
 */
export function createApp(container = setupContainer()) {
  const app = express();

  // Middlewares de base
  app.use(express.json());

  // Middleware CORS simple
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Résolution du contrôleur via le conteneur IoC (Injection de Dépendances)
  const weatherController = container.resolve('weatherController');

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Page d'accueil / Documentation minimale
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Bienvenue sur l\'API Météo (TP1 - Gestion des Dépendances)',
      endpoints: {
        'GET /weather?address={lieu}': 'Récupérer les prévisions météo pour une adresse ou un nom de ville (ex: /weather?address=Alès)',
        'GET /api/weather?address={lieu}': 'Alias de l\'endpoint météo',
        'GET /health': 'Vérification de l\'état du serveur',
      },
    });
  });

  // Routes météo (supporte /weather, /api/weather, /forecast)
  app.get('/weather', weatherController.getWeather);
  app.get('/api/weather', weatherController.getWeather);
  app.get('/forecast', weatherController.getWeather);

  // Route 404 pour les endpoints inconnus
  app.use((req, res) => {
    res.status(404).json({
      error: `Route ${req.method} ${req.url} non trouvée.`,
    });
  });

  // Middleware centralisé de gestion des erreurs
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : (err.status || 500);

    const responsePayload = {
      success: false,
      error: err.message || 'Une erreur interne est survenue.',
      name: err.name || 'InternalServerError',
    };

    if (err.details) {
      responsePayload.details = err.details;
    }

    if (process.env.NODE_ENV === 'development' && statusCode === 500) {
      responsePayload.stack = err.stack;
    }

    res.status(statusCode).json(responsePayload);
  });

  return app;
}
