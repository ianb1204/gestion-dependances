# API Météo Multi-Fournisseurs — TP1 & TP2 (Gestion des Dépendances)

Ce projet implémente une API REST modulaire et découplée en **JavaScript (Node.js)** permettant de géocoder une adresse et de récupérer les prévisions météorologiques associées.

Ce projet valide les concepts avancés d'architecture logicielle :
- **Couplage faible (Loose Coupling)**
- **Inversion de Contrôle (IoC - Inversion of Control)**
- **Injection de Dépendances (DI - Dependency Injection)**
- **Architecture Hexagonale (Ports et Adaptateurs)**
- **Interchangeabilité de fournisseurs externes sans recompilation ni redéploiement**
- **Tests de Contrat uniques (Contract Testing)**
- **Encapsulation stricte des DTOs tiers dans leurs adaptateurs**

---

## 🎯 Contexte et Évolution : TP1 ➔ TP2

### TP1 — Fondations architecturales
- **Objectif** : Mettre en place une API avec IoC et DI pour enchaîner le géocodage et la météo.
- **Fournisseurs initiaux** :
  - Géocodage : **OpenStreetMap Nominatim**
  - Météo : **Open-Meteo**

### TP2 — Changement d'API & Preuve par le coût du changement
- **Objectif** : Mettre à l'épreuve l'architecture construite au TP1. Le client exige désormais :
  1. Un **géocodeur souverain** : **API Adresse de la Base Adresse Nationale (BAN - data.gouv.fr)**.
  2. La capacité de **changer de fournisseur météo sans redéploiement** : intégration de **MET Norway Locationforecast 2.0**.
  3. Une **configuration dynamique** (variable d'environnement ou fichier de configuration) permettant de basculer entre les fournisseurs sans recompilation. Les anciens fournisseurs restent disponibles.
  4. Une **suite de tests de contrat unique**, exécutée contre chaque implémentation d'une même abstraction (réponses simulées par bouchon HTTP) :
     - Adresse valide
     - Adresse introuvable
     - Réponse vide
     - Caractères accentués
  5. La **garantie d'étanchéité** : aucun objet propre à une API (DTO, formats GeoJSON, structures `timeseries`, etc.) ne doit sortir de son adaptateur.

> **Preuve du couplage faible** : Le passage du TP1 au TP2 s'est fait **en ajoutant du code (nouveaux adaptateurs et tests)** sans modifier la logique métier du use case (`GetWeatherByAddressUseCase`) ni le contrôleur HTTP (`WeatherController`).

---

## 🏗️ Structure du Projet (Clean Architecture)

```text
TP1/
├── config.json                     # Configuration modifiable à chaud sans recompilation
├── config.example.json             # Modèle de configuration
├── .env                            # Variables d'environnement
├── .env.example
├── package.json
├── README.md
├── TP1 - API Météo.pdf
├── TP2.pdf
├── src/
│   ├── domain/                     # COUCHE DOMAINE (Indépendante de tout framework ou lib)
│   │   ├── errors/                 # ValidationError, LocationNotFoundError, ExternalServiceError
│   │   └── models/                 # Modèles de domaine stricts (Location, WeatherForecast)
│   ├── services/                   # COUCHE INFRASTRUCTURE & ADAPTATEURS
│   │   ├── interfaces/             # Abstractions / Ports (GeocodingServiceInterface, WeatherServiceInterface, HttpClientInterface)
│   │   ├── http/                   # FetchHttpClient (Client HTTP abstrait)
│   │   ├── geocoding/              # Adaptateurs de Géocodage
│   │   │   ├── BanGeocodingService.js        # [TP2] Adaptateur souverain BAN (data.gouv.fr)
│   │   │   └── NominatimGeocodingService.js  # [TP1] Adaptateur OpenStreetMap Nominatim
│   │   └── weather/                # Adaptateurs Météo
│   │       ├── MetNorwayWeatherService.js    # [TP2] Adaptateur MET Norway (Locationforecast 2.0)
│   │       └── OpenMeteoWeatherService.js    # [TP1] Adaptateur Open-Meteo
│   ├── usecases/                   # COUCHE APPLICATION
│   │   └── GetWeatherByAddressUseCase.js     # Orchestration métier (dépend uniquement des abstractions)
│   ├── controllers/                # COUCHE PRÉSENTATION
│   │   └── WeatherController.js    # Contrôleur Express
│   ├── container/                  # CONTENEUR IOC & COMPOSITION ROOT
│   │   ├── Container.js            # Conteneur IoC générique (singleton / transient, résolution de graphe)
│   │   └── setupContainer.js       # Composition Root avec résolution dynamique selon configuration
│   ├── app.js                      # Factory Express
│   └── server.js                   # Serveur HTTP
└── tests/
    ├── contract/                   # [TP2] TESTS DE CONTRAT UNIQUES
    │   ├── geocodingContract.test.js # Suite unique exécutée contre BAN et Nominatim
    │   └── weatherContract.test.js   # Suite unique exécutée contre MET Norway et Open-Meteo
    ├── unit/                       # TESTS UNITAIRES
    │   ├── Container.test.js
    │   ├── setupContainer.test.js
    │   ├── BanGeocodingService.test.js
    │   ├── NominatimGeocodingService.test.js
    │   ├── MetNorwayWeatherService.test.js
    │   ├── OpenMeteoWeatherService.test.js
    │   └── GetWeatherByAddressUseCase.test.js
    └── e2e/                        # TESTS END-TO-END
        └── weatherApi.e2e.test.js  # Tests complets mockés et tests d'intégration réels
```

---

## ⚙️ Configuration Multi-Fournisseurs (Sans Recompilation)

Le choix des fournisseurs est paramétrable à deux niveaux, **sans modifier le code source** :

### 1. Par Variables d'Environnement (`.env` ou variables système)
```env
# Choix du géocodeur : "ban" (souverain data.gouv.fr) ou "nominatim" (OpenStreetMap)
GEOCODING_PROVIDER=ban

# Choix de la météo : "metnorway" (MET Norway) ou "openmeteo" (Open-Meteo)
WEATHER_PROVIDER=metnorway

# Configuration des URLs
BAN_BASE_URL=https://api-adresse.data.gouv.fr
MET_NORWAY_BASE_URL=https://api.met.no/weatherapi/locationforecast/2.0
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1

# User-Agent identifiable obligatoire (exigé par MET Norway sous peine d'erreur 403)
USER_AGENT=TP2-MeteoApi/1.0 ian.bertin2004@gmail.com
```

### 2. Par Fichier de Configuration (`config.json`)
Un fichier `config.json` peut être édité sans toucher au code ni aux variables d'environnement :
```json
{
  "geocodingProvider": "ban",
  "weatherProvider": "metnorway",
  "port": 3000,
  "httpTimeout": 10000
}
```

*Ordre de priorité de la résolution de configuration :*  
`Overrides injectés en test` > `Variables d'environnement` > `config.json` > `Valeurs par défaut`.

---

## 🛡️ Respect Strict du Contrat & Étanchéité des DTOs (Règle 4)

L'exigence 4 du TP2 stipule :
> *« Vérifiez que les objets propres à chaque API (DTO, noms de champs, formats) ne sortent pas de leur adaptateur. »*

Pour garantir cette étanchéité :
1. **Géocodage** :
   - `BanGeocodingService` convertit le GeoJSON FeatureCollection (`[longitude, latitude]`, `properties.label`, `score`, `citycode`) en entité de domaine `Location`.
   - `NominatimGeocodingService` convertit les objets Nominatim (`osm_id`, `place_id`, `licence`, `boundingbox`) en entité de domaine `Location`.
   - L'entité `Location` ne possède **strictement que** `{ displayName, latitude, longitude }`.
2. **Météo** :
   - `MetNorwayWeatherService` convertit le GeoJSON complexe avec `properties.timeseries`, `data.instant.details.air_temperature`, etc., en entité `WeatherForecast`.
   - `OpenMeteoWeatherService` normalise `current` et `hourly` sans exposer `raw` ni métadonnées internes.
   - L'entité `WeatherForecast` normalise les propriétés (`current`, `hourly`, `temperature`, `windSpeed`, `weatherCode`).

---

## 🧪 Tests

Le projet dispose d'une couverture de tests complète (10 fichiers de test, 63 assertions) exécutés avec **Vitest**.

### Lancer tous les tests :
```bash
npm test
```

### Lancer uniquement les tests de contrat (TP2) :
```bash
npm run test:contract
```

### Lancer les tests unitaires :
```bash
npm run test:unit
```

### Lancer les tests E2E :
```bash
npm run test:e2e
```

### Détail des Suites de Tests de Contrat :
- `tests/contract/geocodingContract.test.js` :
  - **Suite unique** instanciée pour chaque implémentation (`BanGeocodingService` et `NominatimGeocodingService`)
  - Cas testés :
    1. **Adresse valide** (retourne `Location` conforme)
    2. **Adresse introuvable** (lève `LocationNotFoundError`)
    3. **Réponse vide** (lève `LocationNotFoundError`)
    4. **Caractères accentués** (vérification de l'encodage et préservation des caractères)
    5. **Étanchéité du DTO** (vérification qu'aucun champ spécifique à l'API ne fuite)
- `tests/contract/weatherContract.test.js` :
  - **Suite unique** instanciée pour chaque implémentation (`MetNorwayWeatherService` et `OpenMeteoWeatherService`)
  - Cas testés :
    1. **Coordonnées valides** (retourne `WeatherForecast` normalisé)
    2. **Coordonnées invalides** (lève `TypeError`)
    3. **Erreurs HTTP externes** (lève `ExternalServiceError`)
    4. **Étanchéité du DTO** (vérification de l'absence de DTO tiers ou de champs `raw`)

---

## 🚀 Démarrage et Utilisation de l'API

### 1. Démarrer le serveur
```bash
npm start
```

Le serveur démarre et affiche les fournisseurs actifs :
```text
======================================================
🚀 Serveur API Météo démarré sur http://localhost:3000
   Architecture          : IoC + Injection de Dépendances
   Fournisseur Géocodage : BAN
   Fournisseur Météo     : METNORWAY
======================================================
```

### 2. Tester une requête météo
```bash
curl "http://localhost:3000/weather?address=Alès"
```

#### Exemple de réponse (avec BAN + MET Norway) :
```json
{
  "success": true,
  "data": {
    "query": "Alès",
    "location": {
      "displayName": "Alès",
      "latitude": 44.125356,
      "longitude": 4.089242
    },
    "forecast": {
      "latitude": 44.125356,
      "longitude": 4.089242,
      "timezone": "UTC",
      "current": {
        "time": "2026-09-18T14:00:00Z",
        "temperature": 27,
        "temperature_2m": 27,
        "weatherCode": "fair_day",
        "weather_code": "fair_day",
        "windSpeed": 4.7,
        "wind_speed_10m": 4.7,
        "humidity": 29.3,
        "pressure": 1014.6,
        "summary": "fair_day"
      },
      "hourly": {
        "time": ["2026-09-18T14:00:00Z", "2026-09-18T15:00:00Z", "..."],
        "temperature": [27, 27.1, 26.2, "..."],
        "temperature_2m": [27, 27.1, 26.2, "..."],
        "windSpeed": [4.7, 5.2, 5.8, "..."],
        "wind_speed_10m": [4.7, 5.2, 5.8, "..."]
      }
    }
  }
}
```

---

## 👥 Auteur
- **Ian BERTIN** (`ian.bertin2004@gmail.com`)
