import { AppError } from './AppError.js';

/**
 * Erreur levée lorsqu'une adresse postale ou un nom de lieu n'a pas pu être géocodé.
 */
export class LocationNotFoundError extends AppError {
  constructor(address) {
    super(`Aucun lieu trouvé pour l'adresse : "${address}".`, 404);
    this.address = address;
  }
}
