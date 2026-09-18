/**
 * Conteneur d'Inversion de Contrôle (IoC Container).
 * Gère l'enregistrement, la résolution et le cycle de vie (singleton / transitoire) des dépendances.
 */
export class Container {
  constructor() {
    /** @type {Map<string, { definition: any, type: 'factory' | 'value', singleton: boolean, instance?: any }>} */
    this.services = new Map();
    /** @type {Set<string>} pour détecter les dépendances circulaires */
    this.resolving = new Set();
  }

  /**
   * Enregistre une valeur brute (constante, configuration, etc.).
   * @param {string} name
   * @param {any} value
   * @returns {Container}
   */
  registerValue(name, value) {
    this.services.set(name, {
      definition: value,
      type: 'value',
      singleton: true,
      instance: value,
    });
    return this;
  }

  /**
   * Enregistre une factory qui instancie la dépendance à la demande.
   * @param {string} name
   * @param {(container: Container) => any} factoryFn
   * @param {Object} [options]
   * @param {boolean} [options.singleton=true]
   * @returns {Container}
   */
  registerFactory(name, factoryFn, { singleton = true } = {}) {
    if (typeof factoryFn !== 'function') {
      throw new TypeError(`La factory pour "${name}" doit être une fonction.`);
    }

    this.services.set(name, {
      definition: factoryFn,
      type: 'factory',
      singleton,
      instance: undefined,
    });
    return this;
  }

  /**
   * Résout et retourne une dépendance par son nom.
   * @param {string} name
   * @returns {any}
   */
  resolve(name) {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Dépendance inconnue : "${name}". Aucune définition enregistrée dans le conteneur.`);
    }

    if (registration.type === 'value') {
      return registration.instance;
    }

    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance;
    }

    if (this.resolving.has(name)) {
      throw new Error(`Dépendance circulaire détectée lors de la résolution de "${name}".`);
    }

    this.resolving.add(name);
    try {
      const resolvedInstance = registration.definition(this);
      if (registration.singleton) {
        registration.instance = resolvedInstance;
      }
      return resolvedInstance;
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * Vérifie si un service est enregistré.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Clone le conteneur pour créer une portée ou substituer des services (idéal pour les tests).
   * @returns {Container}
   */
  clone() {
    const newContainer = new Container();
    for (const [key, value] of this.services.entries()) {
      newContainer.services.set(key, { ...value, instance: value.type === 'value' ? value.instance : undefined });
    }
    return newContainer;
  }
}
