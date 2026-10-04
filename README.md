# MODULO — Configurateur de conteneur aménagé (démo)

Démo cliquable : 3D temps réel (three.js), options avec prix liés, formulaire de devis fictif.

## Lancer
- Double-clic sur `serve.command` (serveur local sur http://localhost:8080), ou `python3 -m http.server`.
- `index.html` s'ouvre aussi directement en double-clic, mais les fichiers `.glb` ne se chargent qu'avec un serveur.
- Pour un client : déposer tout le dossier sur Netlify / Vercel / n'importe quel hébergement statique.

## Dispositions et options (v2)
- **Disposition** : simple, double en largeur (2 conteneurs, espace ouvert), en L (conteneur principal + module 20' perpendiculaire). Définies dans `LAYOUTS` (catalog.js) et `units()` (pricing.js).
- **Affectation du 2e module** (`ROLES`) : chambre, deux chambres, salle d'eau & buanderie, bureau (logement) ; 2e espace de vente, réserve, sanitaires, cuisine pro (commerce).
- **Sanitaires** (`BATHS`) : WC, douche, baignoire.
- **Options par usage** (`EXTRAS`) : 8 pour le logement (îlot, poêle, dressing, buanderie, VMC, volets, pergola, domotique), 8 pour le commerce (bar, enseigne, store, rampe PMR, vitrines froides, chambre froide, cuisine pro, alarme). Ajouter une option = une ligne dans `EXTRAS` + son visuel dans `scene.js`.

## Où modifier quoi
| Fichier | Rôle |
|---|---|
| `src/catalog.js` | Toute l'offre : tailles, matières, couleurs, options, **prix**, délais |
| `src/pricing.js` | Calcul du prix, règles de dépendance (ex. clim ⇒ électricité), conseils |
| `src/scene.js` | Modèle 3D procédural + coupe intérieure + animations d'apparition |
| `src/main.js` | Interface, récapitulatif, devis, lien de partage (config dans l'URL) |
| `styles.css` | Design (inspiré de open-saas : tokens clair/sombre, halos dégradés ambre/violet) |

Après toute modification dans `src/` : `./build.sh` (regénère `app.js`, three.js inclus).

## Brancher vos assets 3D (.glb)
1. Déposer le fichier dans `assets/`.
2. Dans `src/catalog.js`, renseigner `MODELS`, par exemple :
   `MODELS.deck = { url: 'assets/terrasse.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }`
3. `./build.sh` puis recharger. L'élément procédural est masqué et remplacé par votre modèle.

Clés disponibles : `deck`, `solar`, `green`, `hvac`, `bed`, `sofa`, `kitchen`, `counter`, `shelf`, `bathroom`.

## Prix
Estimations marché France 2026 (HT, pose incluse) : conteneur neuf 4 200 à 6 900 €, aménagement 280 à 450 €/m², isolation 55 à 70 €/m² de paroi, clé en main logement 20' ≈ 1 500 à 2 500 €/m². Ajustables dans `catalog.js`.

## Crédit
Les dimensions et la structure (ossature, coins ISO, ondulations, ouvertures) s'inspirent du modèle OpenSCAD `phrxmd/container` (CC BY-SA 4.0) ; le code ici est écrit de zéro.
