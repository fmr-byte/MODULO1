// ─────────────────────────────────────────────────────────────
//  CATALOGUE — toute l'offre (options, prix HT, règles) vit ici.
//  Prix : estimations marché France 2026, € HT, pose incluse.
//  Pour brancher un asset 3D fourni : voir MODELS en bas de fichier.
// ─────────────────────────────────────────────────────────────
export const BRAND = { name: 'MODULO', tagline: 'Conteneurs aménagés sur mesure' }
export const VAT = 0.2

export const SIZES = [
  { id: '20', label: "20' Standard", L: 6.058, W: 2.438, H: 2.591, base: 4200, mult: 1,
    desc: 'Conteneur maritime neuf « one trip », 6,06 m' },
  { id: '40', label: "40' Standard", L: 12.192, W: 2.438, H: 2.591, base: 6200, mult: 1.6,
    desc: 'Grande surface, 12,19 m' },
  { id: '40hc', label: "40' High Cube", L: 12.192, W: 2.438, H: 2.896, base: 6900, mult: 1.7,
    desc: 'Hauteur +30 cm, 12,19 m' },
]

export const USAGES = [
  { id: 'raw', label: 'Brut', desc: 'Structure seule, aménagement par vos soins', perM2: 0 },
  { id: 'home', label: 'Logement', desc: 'Cloisons, plafond, cuisine équipée, couchage, séjour', perM2: 450 },
  { id: 'shop', label: 'Local commercial', desc: 'Comptoir, présentoirs, éclairage rail, faux-plafond', perM2: 280 },
]

export const CLADDINGS = [
  { id: 'steel', label: 'Acier ondulé', desc: 'Tôle d’origine, peinture marine', perM2: 0, colors: true },
  { id: 'wood', label: 'Bois (mélèze)', desc: 'Bardage ajouré, classe 3', perM2: 85 },
  { id: 'composite', label: 'Composite', desc: 'Lames aluminium-composite', perM2: 110, colors: true },
  { id: 'corten', label: 'Acier Corten', desc: 'Patine rouille stabilisée', perM2: 140 },
]

export const COLORS = [
  { id: 'blue', label: 'Bleu maritime', hex: '#2b5d8f', free: true },
  { id: 'green', label: 'Vert sapin', hex: '#2f5d46' },
  { id: 'red', label: 'Rouge oxyde', hex: '#9a3b2c' },
  { id: 'anth', label: 'Anthracite', hex: '#3a3d42' },
  { id: 'white', label: 'Blanc', hex: '#e6e6e1' },
  { id: 'sand', label: 'Sable', hex: '#bba98a' },
  { id: 'black', label: 'Noir', hex: '#16171a' },
]
export const PAINT_PER_M2 = 22

export const ENDWALLS = [
  { id: 'cargo', label: 'Portes cargo', desc: 'Conservées, verrouillage d’origine', price: 0 },
  { id: 'glass', label: 'Façade vitrée', desc: 'Vitrage aluminium pleine largeur', price: 3800 },
  { id: 'solid', label: 'Mur plein', desc: 'Pignon fermé, soudé', price: 450 },
]

export const ROOFS = [
  { id: 'steel', label: 'Acier', desc: 'Toit d’origine', perM2: 0, fixed: 0 },
  { id: 'green', label: 'Végétalisé', desc: 'Sedum, étanchéité renforcée', perM2: 120, fixed: 0 },
  { id: 'solar', label: 'Solaire', desc: 'Panneaux 3 kWc (20’) / 6 kWc (40’)', perM2: 0, fixedBySize: { '20': 5200, '40': 9800, '40hc': 9800 }, requires: ['electric'] },
]

export const INSULATIONS = [
  { id: 'none', label: 'Aucune', desc: 'Tôle nue', perM2: 0, weeks: 0 },
  { id: 'rock', label: 'Laine de roche 100 mm', desc: 'Murs + toit, BA13', perM2: 55, weeks: 1 },
  { id: 'pu', label: 'Polyuréthane 150 mm', desc: 'Projeté, haute performance', perM2: 70, weeks: 1 },
]

export const FLOORS = [
  { id: 'marine', label: 'Origine', desc: 'Contreplaqué marine', perM2: 0 },
  { id: 'oak', label: 'Parquet chêne', desc: 'Contrecollé 14 mm', perM2: 70 },
  { id: 'concrete', label: 'Béton ciré', desc: 'Chape fine + résine', perM2: 85 },
]

export const OPENINGS = {
  window: { label: 'Fenêtres', price: 780, desc: '1,0 × 1,0 m, double vitrage alu' },
  baie: { label: 'Baie vitrée coulissante', price: 2900, desc: '2,4 × 2,1 m, côté terrasse' },
  door: { label: 'Porte d’entrée vitrée', price: 1350, desc: '0,95 × 2,1 m, côté opposé' },
}

export const TECH = {
  electric: { label: 'Pack électrique', perM2: 110, minimum: 900, desc: 'Tableau, prises, éclairage LED' },
  hvac: { label: 'Climatisation réversible', price: 2600, mult: true, desc: 'Split inverter', requires: ['electric'] },
}

export const LAYOUTS = [
  { id: 'single', label: 'Simple', desc: '1 conteneur', link: 0 },
  { id: 'double', label: 'Double en largeur', desc: '2 conteneurs côte à côte, espace ouvert (4,88 m)', link: 1900 },
  { id: 'L', label: 'En L', desc: 'Conteneur principal + module 20\u2019 perpendiculaire', link: 1800 },
]

// Affectation du 2e module (layouts double et L)
export const ROLES = [
  { id: 'bedroom', usage: 'home', label: 'Chambre', desc: 'Lit double, dressing, rangements', perM2: 450 },
  { id: 'kids', usage: 'home', label: 'Deux chambres', desc: 'Deux couchages séparés par une cloison', perM2: 450 },
  { id: 'wet', usage: 'home', label: 'Salle d\u2019eau & buanderie', desc: 'Douche, WC, vasques, lave-linge', perM2: 520 },
  { id: 'office', usage: 'home', label: 'Bureau / chambre d\u2019amis', desc: 'Poste de travail, canapé-lit', perM2: 400 },
  { id: 'sales', usage: 'shop', label: '2e espace de vente', desc: 'Présentoirs, rayonnages, éclairage rail', perM2: 280 },
  { id: 'stock', usage: 'shop', label: 'Réserve & bureau', desc: 'Rayonnages métalliques, poste de gestion', perM2: 200 },
  { id: 'wet', usage: 'shop', label: 'Sanitaires & coin pause', desc: 'WC PMR, lave-mains, kitchenette', perM2: 320 },
  { id: 'kitchen', usage: 'shop', label: 'Cuisine professionnelle', desc: 'Inox, plonge, passe-plat', perM2: 480 },
]
export const defaultRole = (usage) => (usage === 'home' ? 'bedroom' : usage === 'shop' ? 'stock' : 'raw')

export const BATHS = [
  { id: 'none', label: 'Aucune', desc: 'Pas de point d\u2019eau', price: 0, zone: 0 },
  { id: 'wc', label: 'WC + lave-mains', desc: 'Cabinet séparé', price: 2300, zone: 1.15 },
  { id: 'shower', label: 'Douche, WC, vasque', desc: 'Salle d\u2019eau complète, ballon 50 L', price: 5200, zone: 1.55 },
  { id: 'tub', label: 'Baignoire, WC, double vasque', desc: 'Salle de bain, ballon 80 L', price: 6900, zone: 2.0 },
]

// Options spécifiques à l'usage. price = forfait ; perOpening = par fenêtre/baie.
export const EXTRAS = [
  // logement
  { id: 'island', usage: 'home', label: 'Cuisine équipée avec îlot', desc: 'Remplace la table : îlot + tabourets', price: 3800 },
  { id: 'stove', usage: 'home', label: 'Poêle à bois + conduit', desc: 'Poêle 6 kW, sortie de toit', price: 2900 },
  { id: 'wardrobe', usage: 'home', label: 'Dressing sur mesure', desc: 'Placard pleine hauteur', price: 1800 },
  { id: 'laundry', usage: 'home', label: 'Coin buanderie', desc: 'Lave-linge + sèche-linge', price: 1400, requires: ['bath'] },
  { id: 'vmc', usage: 'home', label: 'VMC double flux', desc: 'Renouvellement d\u2019air, bouches de toit', price: 1900 },
  { id: 'shutters', usage: 'home', label: 'Volets roulants électriques', desc: 'Sur toutes les ouvertures', perOpening: 450 },
  { id: 'pergola', usage: 'home', label: 'Pergola bois', desc: 'Au-dessus de la terrasse', price: 2400, requires: ['deck'] },
  { id: 'smart', usage: 'home', label: 'Domotique & alarme', desc: 'Éclairage, volets, sécurité', price: 1600 },
  // local commercial
  { id: 'bar', usage: 'shop', label: 'Comptoir bar + tabourets', desc: 'Bar vitré côté vitrine', price: 2100 },
  { id: 'sign', usage: 'shop', label: 'Enseigne lumineuse', desc: 'Caisson LED en façade', price: 1400 },
  { id: 'awning', usage: 'shop', label: 'Store banne', desc: 'Toile motorisée 3 m', price: 1300 },
  { id: 'ramp', usage: 'shop', label: 'Rampe d\u2019accès PMR', desc: 'Pente 8 %, antidérapante', price: 1600 },
  { id: 'fridge', usage: 'shop', label: 'Vitrines réfrigérées', desc: 'Deux meubles de vente', price: 3200, requires: ['electric'] },
  { id: 'coldroom', usage: 'shop', label: 'Chambre froide', desc: 'Cellule 1,8 × 1,8 m', price: 4900, requires: ['electric'] },
  { id: 'kitchenpro', usage: 'shop', label: 'Cuisine pro + hotte', desc: 'Inox, hotte, extraction toit', price: 7500, requires: ['electric'] },
  { id: 'security', usage: 'shop', label: 'Alarme & vidéosurveillance', desc: '4 caméras, détection', price: 1400 },
]

export const DECK = { label: 'Terrasse bois', perM2: 150, depth: 2.0, desc: 'Pin classe 4, garde-corps' }

export const DELIVERIES = [
  { id: 'pickup', label: 'Retrait atelier', price: 0 },
  { id: 'near', label: 'Moins de 150 km', price: 750 },
  { id: 'mid', label: '150 – 500 km', price: 1400 },
  { id: 'far', label: 'Plus de 500 km', price: 2200 },
]
export const CRANE = { label: 'Grutage sur site', price: 1200, desc: 'Camion-grue, déchargement et calage' }

// ── Assets 3D fournis ─────────────────────────────────────────
//  Chaque clé correspond à un élément de la scène. Renseigner `url`
//  (fichier .glb dans /assets) pour remplacer l'élément procédural.
//  Clés : deck, solar, hvac, bed, sofa, kitchen, desk, counter, shelf,
//         bathroom, window, baie, door ...
//  Exemple : deck: { url: 'assets/terrasse.glb', position: [0,0,0], rotation: [0,0,0], scale: 1 }
export const MODELS = {}

export const defaultState = () => ({
  size: '20', usage: 'home', cladding: 'steel', color: 'blue', roof: 'steel',
  layout: 'single', module2: 'bedroom', x: {},
  deck: false, windows: 2, baie: false, door: false, endwall: 'cargo',
  insulation: 'rock', floor: 'marine', electric: true, hvac: false, bath: 'shower',
  delivery: 'near', crane: true,
})

export const byId = (list, id) => list.find((x) => x.id === id)
