/**
 * Modèle de domaine représentant une localisation géocodée.
 */
export class Location {
  /**
   * @param {Object} params
   * @param {string} params.displayName - Nom complet ou descriptif du lieu
   * @param {number} params.latitude - Latitude
   * @param {number} params.longitude - Longitude
   */
  constructor({ displayName, latitude, longitude }) {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw new TypeError('La latitude doit être un nombre valide.');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw new TypeError('La longitude doit être un nombre valide.');
    }

    this.displayName = displayName || 'Lieu inconnu';
    this.latitude = latitude;
    this.longitude = longitude;
  }

  toJSON() {
    return {
      displayName: this.displayName,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
