import { AppError } from './AppError.js';

/**
 * Erreur levée lorsque les paramètres d'entrée sont invalides (ex: adresse manquante).
 */
export class ValidationError extends AppError {
  constructor(message = 'Paramètre d\'adresse manquant ou invalide.') {
    super(message, 400);
  }
}
