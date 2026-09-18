import 'dotenv/config';
import { createApp } from './app.js';
import { setupContainer } from './container/setupContainer.js';

const container = setupContainer();
const config = container.resolve('config');
const app = createApp(container);

const server = app.listen(config.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Serveur API Météo démarré sur http://localhost:${config.PORT}`);
  console.log(`   Architecture : IoC + Injection de Dépendances`);
  console.log(`======================================================`);
  console.log(`📍 Exemple d'utilisation :`);
  console.log(`   curl "http://localhost:${config.PORT}/weather?address=Al%C3%A8s"`);
  console.log(`   curl "http://localhost:${config.PORT}/weather?address=Paris"`);
  console.log(`======================================================\n`);
});

// Arrêt gracieux
const handleShutdown = () => {
  console.log('\nFermeture du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès.');
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
