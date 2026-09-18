# TP1 — API Météo (Gestion des Dépendances)

Ce projet implémente une API REST en **JavaScript (Node.js)** permettant de recevoir une adresse postale ou un nom de lieu en paramètre `GET` et de renvoyer les prévisions météorologiques correspondantes.

Conformément aux exigences du cours de **Gestion des Dépendances**, l'application applique rigoureusement les bonnes pratiques d'architecture logicielle :
- **Couplage faible (Loose Coupling)**
- **Inversion de Contrôle (IoC - Inversion of Control)**
- **Injection de Dépendances (DI - Dependency Injection)**
- **Testabilité complète (Tests Unitaires et End-to-End)**

---

## 🏗️ Architecture et Principes Logiciels

L'application est structurée selon les principes de la **Clean Architecture** (Architecture Hexagonale / Ports et Adaptateurs) :

```text
TP1/
├── src/
│   ├── domain/                         # Couche Domaine (Entités & Erreurs métier)
│   │   ├── errors/                     # ValidationError, LocationNotFoundError, ExternalServiceError
│   │   └── models/                     # Location, WeatherForecast
│   ├── services/                       # Couche Infrastructure & Adaptateurs
│   │   ├── interfaces/                 # Abstractions (HttpClientInterface, GeocodingServiceInterface, WeatherServiceInterface)
│   │   ├── http/                       # FetchHttpClient (implémentation du client HTTP)
│   │   ├── geocoding/                  # NominatimGeocodingService (implémentation OpenStreetMap)
│   │   └── weather/                    # OpenMeteoWeatherService (implémentation Open-Meteo)
│   ├── usecases/                       # Couche Application
│   │   └── GetWeatherByAddressUseCase.js  # Orchestration métier (indépendante de tout framework ou lib externe)
│   ├── controllers/                    # Couche Présentation (Contrôleurs HTTP)
│   │   └── WeatherController.js
│   ├── container/                      # Conteneur IoC & Composition Root
│   │   ├── Container.js                # Conteneur IoC générique (singleton / transient, résolution)
│   │   └── setupContainer.js           # Racine de composition (câblage des dépendances)
│   ├── app.js                          # Factory de l'application Express (reçoit le conteneur IoC)
│   └── server.js                       # Point d'entrée exécutable (démarrage HTTP)
├── tests/
│   ├── unit/                           # Tests unitaires avec mocks / stubs
│   │   ├── Container.test.js
│   │   ├── NominatimGeocodingService.test.js
│   │   ├── OpenMeteoWeatherService.test.js
│   │   └── GetWeatherByAddressUseCase.test.js
│   └── e2e/                            # Tests End-to-End (Supertest)
│       └── weatherApi.e2e.test.js
├── .env.example
├── package.json
└── README.md
```

### 1. Couplage Faible (Loose Coupling)
- Le cas d'utilisation `GetWeatherByAddressUseCase` ne dépend **d'aucune bibliothèque concrète** (ni de `fetch`, ni de Nominatim, ni d'Open-Meteo). Il ne dépend que des contrats d'interface `GeocodingServiceInterface` et `WeatherServiceInterface`.
- Les services d'infrastructure (`NominatimGeocodingService`, `OpenMeteoWeatherService`) ne créent pas leur propre client HTTP : ils reçoivent une abstraction `HttpClientInterface`. Remplacer `fetch` par `axios` ou un client HTTP avec cache se fait sans modifier une seule ligne des services métier.

### 2. Inversion de Contrôle (IoC)
- Aucune classe n'instancie directement ses propres dépendances avec un `new`. Le contrôle de la création et du cycle de vie des objets est délégué au **Conteneur IoC** (`Container.js`).
- La racine de composition (`setupContainer.js`) est le seul endroit centralisé où les abstractions sont liées à leurs implémentations concrètes.

### 3. Injection de Dépendances (DI)
- Toutes les dépendances sont injectées via le **constructeur** (*Constructor Injection*).
- Dans les tests unitaires et d'intégration, il suffit de passer des objets fictifs (Mocks ou Stubs) dans le constructeur ou dans `setupContainer({ geocodingService: mockService })` sans recourir à du monkey-patching complexe.

---

## 🌐 Services Externes Intégrés

1. **Géocodage : OpenStreetMap Nominatim**
   - Rôle : Convertir une adresse ou un nom de ville en coordonnées GPS (`latitude`, `longitude`).
   - Exemple d'appel : `https://nominatim.openstreetmap.org/search?q=Alès&format=json`
   - Spécificité : Utilisation d'un `User-Agent` valide conformément aux règles d'usage de la fondation OpenStreetMap.

2. **Météo : Open-Meteo**
   - Rôle : Obtenir les prévisions météorologiques associées aux coordonnées géographiques.
   - Exemple d'appel : `https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&hourly=shortwave_radiation`
   - Spécificité : Prise en charge des variables horaires demandées dans le sujet (`shortwave_radiation`) et des conditions actuelles (température, vent, météo).

---

## 🚀 Installation et Lancement

### Prérequis
- Node.js (v18 ou supérieur)
- Git

### 1. Cloner le dépôt et installer les dépendances
```bash
npm install
```

### 2. Configuration (.env)
Un fichier `.env` est déjà présent. Vous pouvez l'adapter au besoin :
```env
PORT=3000
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
USER_AGENT=WeatherApp/1.0 (TP-Gestion-Dependances)
HTTP_TIMEOUT=10000
```

### 3. Lancer l'application
- Mode standard :
```bash
npm start
```
- Mode développement (rechargement automatique) :
```bash
npm run dev
```

---

## 📡 Utilisation de l'API

Une fois le serveur démarré sur `http://localhost:3000` :

### 1. Obtenir les prévisions météo pour une adresse / ville
```bash
curl "http://localhost:3000/weather?address=Alès"
```
*(Vous pouvez également utiliser `GET /api/weather?address=...` ou `GET /forecast?address=...`)*

#### Exemple de réponse JSON (200 OK) :
```json
{
  "success": true,
  "data": {
    "query": "Alès",
    "location": {
      "displayName": "Alès, Gard, Occitanie, France métropolitaine, 30100, France",
      "latitude": 44.1253665,
      "longitude": 4.0852818
    },
    "forecast": {
      "latitude": 44.12,
      "longitude": 4.0799994,
      "timezone": "GMT",
      "current": {
        "time": "2026-09-18T12:00",
        "temperature_2m": 27.3,
        "weather_code": 0,
        "wind_speed_10m": 10.4
      },
      "hourly": {
        "time": ["2026-09-18T00:00", "2026-09-18T01:00", "..."],
        "shortwave_radiation": [0, 0, 9.8, 92.8, 259, "..."],
        "temperature_2m": [14.9, 14.8, 16.1, "..."]
      }
    }
  }
}
```

### 2. Gestion des erreurs
- **400 Bad Request** (paramètre `address` manquant) :
  ```bash
  curl -s "http://localhost:3000/weather"
  ```
  ```json
  {
    "success": false,
    "error": "Le paramètre \"address\" est obligatoire et ne peut pas être vide.",
    "name": "ValidationError"
  }
  ```

- **404 Not Found** (adresse introuvable) :
  ```bash
  curl -s "http://localhost:3000/weather?address=VilleInexistanteXyz123"
  ```
  ```json
  {
    "success": false,
    "error": "Aucun lieu trouvé pour l'adresse : \"VilleInexistanteXyz123\".",
    "name": "LocationNotFoundError"
  }
  ```

- **502 Bad Gateway** (panne ou indisponibilité du service tiers) :
  ```json
  {
    "success": false,
    "error": "Erreur lors de la communication avec le service tiers [Nominatim] : ...",
    "name": "ExternalServiceError"
  }
  ```

### 3. Health Check
```bash
curl "http://localhost:3000/health"
```

---

## 🧪 Tests (Unitaires & End-to-End)

Les tests sont exécutés avec [Vitest](https://vitest.dev/) et [Supertest](https://github.com/ladjs/supertest).

### Lancer tous les tests :
```bash
npm test
```

### Détail de la couverture de tests :
- `tests/unit/Container.test.js` :
  - Enregistrement des valeurs et des factories
  - Gestion du cycle de vie Singleton vs Transient
  - Détection des dépendances circulaires et des services inconnus
  - Clonage et substitution de dépendances pour les tests
- `tests/unit/NominatimGeocodingService.test.js` :
  - Géocodage d'une adresse avec mock du client HTTP
  - Injection obligatoire du client HTTP
  - Encodage des paramètres d'URL et en-tête `User-Agent`
  - Gestion des adresses inexistantes (404) et erreurs réseau (502)
- `tests/unit/OpenMeteoWeatherService.test.js` :
  - Récupération des prévisions météo avec mock HTTP
  - Validation des coordonnées géographiques
  - Présence du paramètre `shortwave_radiation`
- `tests/unit/GetWeatherByAddressUseCase.test.js` :
  - Orchestration complète en isolation avec stubs/mocks
  - Validation des données d'entrée
  - Propagation des erreurs métier
- `tests/e2e/weatherApi.e2e.test.js` :
  - Tests HTTP de bout en bout avec Supertest (statuts 200, 400, 404, 502)
  - Substitution de dépendances via le conteneur IoC
  - Test E2E d'intégration réel interrogeant en direct les API Nominatim et Open-Meteo pour "Alès".
