import { describe, it, expect } from 'vitest';
import { Container } from '../../src/container/Container.js';

describe('IoC Container (Tests unitaires)', () => {
  it('devrait enregistrer et résoudre une valeur statique', () => {
    const container = new Container();
    container.registerValue('port', 8080);

    expect(container.resolve('port')).toBe(8080);
  });

  it('devrait enregistrer et résoudre une factory en tant que singleton par défaut', () => {
    const container = new Container();
    let counter = 0;
    container.registerFactory('service', () => ({ id: ++counter }));

    const instance1 = container.resolve('service');
    const instance2 = container.resolve('service');

    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(1);
    expect(instance1).toBe(instance2);
  });

  it('devrait instancier un nouvel objet à chaque résolution si singleton est faux', () => {
    const container = new Container();
    let counter = 0;
    container.registerFactory('transientService', () => ({ id: ++counter }), { singleton: false });

    const instance1 = container.resolve('transientService');
    const instance2 = container.resolve('transientService');

    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(2);
    expect(instance1).not.toBe(instance2);
  });

  it('devrait injecter des dépendances via le conteneur', () => {
    const container = new Container();
    container.registerValue('dbConnection', { connected: true });
    container.registerFactory('userRepository', (c) => ({
      db: c.resolve('dbConnection'),
    }));

    const repo = container.resolve('userRepository');
    expect(repo.db).toEqual({ connected: true });
  });

  it('devrait lever une erreur si la dépendance n\'est pas enregistrée', () => {
    const container = new Container();
    expect(() => container.resolve('unknownService')).toThrow('Dépendance inconnue');
  });

  it('devrait détecter et lever une erreur sur une dépendance circulaire', () => {
    const container = new Container();
    container.registerFactory('serviceA', (c) => c.resolve('serviceB'));
    container.registerFactory('serviceB', (c) => c.resolve('serviceA'));

    expect(() => container.resolve('serviceA')).toThrow('Dépendance circulaire détectée');
  });

  it('devrait cloner le conteneur pour permettre la substitution de dépendances', () => {
    const container = new Container();
    container.registerValue('apiKey', 'real-key');

    const cloned = container.clone();
    cloned.registerValue('apiKey', 'mocked-key');

    expect(container.resolve('apiKey')).toBe('real-key');
    expect(cloned.resolve('apiKey')).toBe('mocked-key');
  });
});
