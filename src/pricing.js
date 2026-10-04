import {
  SIZES, USAGES, CLADDINGS, COLORS, PAINT_PER_M2, ENDWALLS, ROOFS, INSULATIONS, FLOORS,
  OPENINGS, TECH, DECK, DELIVERIES, CRANE, VAT, LAYOUTS, ROLES, BATHS, EXTRAS, defaultRole, byId,
} from './catalog.js'

export const INNER = 0.12 // épaisseur parois (m) retirée pour la surface utile

// ── Assemblage : liste des conteneurs, positions, rôles ──────
export function units(state) {
  const s = byId(SIZES, state.size)
  const main = { L: s.L, W: s.W, H: s.H, base: s.base, sizeId: s.id }
  const U = []
  const raw = state.usage === 'raw'
  const role2 = raw ? 'raw' : (ROLES.find((r) => r.usage === state.usage && r.id === state.module2) ? state.module2 : defaultRole(state.usage))
  const front = state.endwall
  if (state.layout === 'double') {
    U.push({ ...main, x: 0, z: -s.W / 2, rot: 0, role: 'main', openA: true, front, cutSide: null })
    U.push({ ...main, x: 0, z: s.W / 2, rot: 0, role: role2, openB: true, front, cutSide: 'A' })
  } else if (state.layout === 'L') {
    const a = { L: SIZES[0].L, W: s.W, H: s.H, base: state.size === '40hc' ? 4700 : 4200, sizeId: '20' }
    U.push({ ...main, x: 0, z: 0, rot: 0, role: 'main', front, cutSide: 'A', linkB: { x: s.L / 2 - s.W / 2, w: s.W - 0.5 } })
    U.push({ ...a, x: s.L / 2 - s.W / 2, z: -(s.W / 2 + a.L / 2), rot: -Math.PI / 2, role: role2, front: 'hole', cutSide: 'B' })
  } else {
    U.push({ ...main, x: 0, z: 0, rot: 0, role: 'main', front, cutSide: 'A' })
  }
  U[0].frontDoor = !!state.door && (front === 'cargo' || front === 'solid')
  // recentrage de l'ensemble
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  U.forEach((u) => {
    const sw = Math.abs(Math.cos(u.rot)) > 0.5
    const hx = (sw ? u.L : u.W) / 2, hz = (sw ? u.W : u.L) / 2
    x0 = Math.min(x0, u.x - hx); x1 = Math.max(x1, u.x + hx); z0 = Math.min(z0, u.z - hz); z1 = Math.max(z1, u.z + hz)
  })
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  U.forEach((u, i) => { u.i = i; u.x -= cx; u.z -= cz })
  U.extent = { x: x1 - x0, z: z1 - z0 }
  U.terrace = state.layout === 'double' ? 1 : 0
  return U
}

export function dims(state) {
  const s = byId(SIZES, state.size)
  const U = units(state)
  let surface = 0, envelope = 0, extWalls = 0, roofArea = 0, mult = 0, baseTotal = 0
  U.forEach((u) => {
    surface += (u.L - INNER) * (u.W - INNER)
    envelope += 2 * (u.L + u.W) * u.H + u.L * u.W
    extWalls += 2 * (u.L + u.W) * u.H
    roofArea += u.L * u.W
    mult += u.L > 8 ? 1.5 : 1
    baseTotal += u.base
  })
  let shared = 0
  if (state.layout === 'double') shared = s.L * s.H
  if (state.layout === 'L') shared = (s.W - 0.5) * (s.H - 0.45)
  envelope -= 2 * shared; extWalls -= 2 * shared
  const surfaces = U.map((u) => (u.L - INNER) * (u.W - INNER))
  return { ...s, units: U, n: U.length, surface, surfaces, envelope, extWalls, roofArea, mult, baseTotal,
    longWalls: extWalls, extent: U.extent }
}

// ── Ouvertures : positions par unité et par côté ─────────────
export function layoutOpenings(state) {
  const U = units(state)
  const L = U.map(() => ({ A: [], B: [] }))
  const ter = U.terrace
  if (state.baie) L[ter].A.push({ kind: 'baie', x: 0, w: 2.4, y0: 0.2, h: 2.1 })
  U.forEach((u, i) => {
    if (u.linkB) L[i].B.push({ kind: 'link', x: u.linkB.x, w: u.linkB.w, y0: 0.2, h: u.H - 0.45 })
  })
  const free = (list, x) => list.every((o) => Math.abs(o.x - x) > o.w / 2 + 0.5 + 0.35)
  const lists = []
  U.forEach((u, i) => {
    const m = Math.floor(u.L / 2.0)
    for (const side of ['A', 'B']) {
      if ((side === 'A' && u.openA) || (side === 'B' && u.openB)) continue
      const slots = []
      for (let k = 0; k < m; k++) {
        const x = -u.L / 2 + (u.L * (k + 1)) / (m + 1)
        if (free(L[i][side], x)) slots.push({ i, side, x })
      }
      lists.push(slots)
    }
  })
  const ordered = []
  for (let k = 0; ordered.length < 999; k++) {
    let any = false
    lists.forEach((l) => { if (l[k]) { ordered.push(l[k]); any = true } })
    if (!any) break
  }
  const maxWindows = ordered.length
  const n = Math.min(state.windows, maxWindows)
  ordered.slice(0, n).forEach((s) => L[s.i][s.side].push({ kind: 'window', x: s.x, w: 1.0, y0: 0.95, h: 1.0 }))
  return { units: L, maxWindows, count: n, openings: n + (state.baie ? 1 : 0) }
}

export const extrasFor = (usage) => EXTRAS.filter((e) => e.usage === usage)
export const hasX = (state, id) => !!state.x?.[id]
export function bathUnit(state) {
  const r = units(state)
  return r.length > 1 && (r[1].role === 'wet' || r[1].role === 'bedroom') ? 1 : 0
}

export function normalize(state) {
  const s = { ...state, x: { ...(state.x || {}) } }
  const notes = []
  if (s.plumbing !== undefined) { if (s.plumbing && s.bath === 'none') s.bath = 'shower'; delete s.plumbing }
  if (!ROLES.find((r) => r.usage === s.usage && r.id === s.module2)) s.module2 = defaultRole(s.usage)
  // extras applicables à l'usage seulement
  Object.keys(s.x).forEach((k) => { const e = EXTRAS.find((x) => x.id === k); if (!e || e.usage !== s.usage || !s.x[k]) delete s.x[k] })
  const needElec = (why) => { if (!s.electric) { s.electric = true; notes.push(`Pack électrique ajouté (requis : ${why}).`) } }
  if (s.hvac) needElec('climatisation')
  if (s.bath !== 'none') needElec('point d’eau')
  if (s.roof === 'solar') needElec('solaire')
  Object.keys(s.x).forEach((k) => {
    const e = EXTRAS.find((x) => x.id === k)
    ;(e.requires || []).forEach((r) => {
      if (r === 'electric') needElec(e.label.toLowerCase())
      if (r === 'deck' && !s.deck) { s.deck = true; notes.push('Terrasse bois ajoutée (requise pour la pergola).') }
      if (r === 'bath' && s.bath === 'none') { s.bath = 'shower'; notes.push('Salle d’eau ajoutée (requise pour la buanderie).'); needElec('salle d’eau') }
    })
  })
  if (s.layout !== 'single' && s.usage !== 'raw' && s.module2 === 'wet' && s.bath === 'none') {
    s.bath = 'shower'; needElec('salle d’eau')
    notes.push('Salle d’eau ajoutée : le 2e module est une salle d’eau.')
  }
  if (s.door && s.endwall === 'glass') { s.door = false; notes.push('La façade vitrée intègre déjà l\u2019accès : porte d\u2019entrée retirée.') }
  const { maxWindows } = layoutOpenings(s)
  if (s.windows > maxWindows) s.windows = maxWindows
  return { state: s, notes }
}

export function advice(state) {
  const out = []
  if (state.usage === 'home' && state.insulation === 'none') out.push('Une isolation est fortement recommandée pour un logement (confort thermique, condensation).')
  if (state.usage === 'home' && state.bath === 'none') out.push('Aucune salle d’eau : prévoyez-en une pour un usage logement.')
  if (state.usage === 'shop' && !state.electric) out.push('Un local commercial nécessite une installation électrique.')
  if (state.usage === 'shop' && state.bath === 'none') out.push('Sanitaires non prévus : obligatoires pour un établissement recevant du public selon l’activité.')
  if (state.hvac && state.insulation === 'none') out.push('Une climatisation est peu efficace sans isolation.')
  if (state.layout !== 'single' && state.usage === 'raw') out.push('Choisissez un usage pour définir l’affectation du 2e module.')
  return out
}

export function price(state) {
  const d = dims(state)
  const lay = layoutOpenings(state)
  const U = d.units
  const lines = []
  const add = (group, label, detail, amount) => { if (amount) lines.push({ group, label, detail, amount: Math.round(amount) }) }
  const f1 = (n) => n.toFixed(1).replace('.', ',')
  const lo = LAYOUTS.find((l) => l.id === state.layout)

  const structLabel = state.layout === 'double' ? `2 × Conteneur ${d.label}` : state.layout === 'L' ? `Conteneur ${d.label} + module 20’` : `Conteneur ${d.label}`
  add('Structure', structLabel, state.layout === 'single' ? `${f1(d.L)} × ${f1(d.W)} × ${f1(d.H)} m`.replace(/\./g, ',') : `${lo.label}`, d.baseTotal)
  if (lo.link) add('Structure', 'Liaison des conteneurs', 'Découpe, renfort IPN, finitions', lo.link * (state.layout === 'double' ? d.L / 6.058 : 1))

  const us = byId(USAGES, state.usage)
  U.forEach((u, i) => {
    const m2 = d.surfaces[i]
    if (state.usage === 'raw') return
    if (u.role === 'main') add('Aménagement', `Aménagement ${us.label.toLowerCase()}${U.length > 1 ? ' · module principal' : ''}`, `${m2.toFixed(1)} m² × ${us.perM2} €`, us.perM2 * m2)
    else { const r = ROLES.find((x) => x.usage === state.usage && x.id === u.role); add('Aménagement', `Module 2 : ${r.label}`, `${m2.toFixed(1)} m² × ${r.perM2} €`, r.perM2 * m2) }
  })
  const fl = byId(FLOORS, state.floor)
  add('Aménagement', `Sol : ${fl.label}`, `${d.surface.toFixed(1)} m² × ${fl.perM2} €`, fl.perM2 * d.surface)
  const ins = byId(INSULATIONS, state.insulation)
  add('Aménagement', `Isolation : ${ins.label}`, `${Math.round(d.envelope)} m² × ${ins.perM2} €`, ins.perM2 * d.envelope)
  const bt = byId(BATHS, state.bath)
  add('Aménagement', `Sanitaires : ${bt.label}`, '', bt.price)

  const cl = byId(CLADDINGS, state.cladding)
  add('Extérieur', `Bardage : ${cl.label}`, `${Math.round(d.extWalls)} m² × ${cl.perM2} €`, cl.perM2 * d.extWalls)
  const col = byId(COLORS, state.color)
  if (cl.colors && !col.free) add('Extérieur', `Peinture : ${col.label}`, `${Math.round(d.extWalls)} m² × ${PAINT_PER_M2} €`, PAINT_PER_M2 * d.extWalls)
  const ro = byId(ROOFS, state.roof)
  add('Extérieur', `Toit : ${ro.label}`, ro.perM2 ? `${Math.round(d.roofArea)} m² × ${ro.perM2} €` : '',
    ro.perM2 * d.roofArea + (ro.fixedBySize ? U.reduce((a, u) => a + ro.fixedBySize[u.sizeId], 0) : ro.fixed || 0))
  if (state.deck) { const t = U[U.terrace]; add('Extérieur', DECK.label, `${(t.L * DECK.depth).toFixed(0)} m² × ${DECK.perM2} €`, DECK.perM2 * t.L * DECK.depth) }
  const ew = byId(ENDWALLS, state.endwall)
  const exposed = U.filter((u) => u.front !== 'hole').length
  add('Extérieur', `Pignon${exposed > 1 ? 's' : ''} : ${ew.label}${exposed > 1 ? ' × ' + exposed : ''}`, '', ew.price * exposed)

  if (lay.count) add('Ouvertures', `${OPENINGS.window.label} × ${lay.count}`, `${OPENINGS.window.price} € / pièce`, OPENINGS.window.price * lay.count)
  if (state.baie) add('Ouvertures', OPENINGS.baie.label, '', OPENINGS.baie.price)
  if (state.door) add('Ouvertures', OPENINGS.door.label, '', OPENINGS.door.price)

  if (state.electric) add('Technique', TECH.electric.label, `${d.surface.toFixed(1)} m² × ${TECH.electric.perM2} €`, Math.max(TECH.electric.minimum, TECH.electric.perM2 * d.surface))
  if (state.hvac) add('Technique', TECH.hvac.label, d.mult > 1.2 ? `${d.mult > 2 ? 'Multi-split' : 'Split renforcé'}` : '', TECH.hvac.price * d.mult)

  EXTRAS.filter((e) => hasX(state, e.id)).forEach((e) => {
    add(e.usage === 'home' ? 'Options logement' : 'Options local commercial', e.label,
      e.perOpening ? `${lay.openings} ouvertures × ${e.perOpening} €` : '', e.perOpening ? e.perOpening * lay.openings : e.price)
  })

  const dl = byId(DELIVERIES, state.delivery)
  add('Livraison', `Livraison : ${dl.label}`, d.n > 1 ? `${d.n} conteneurs` : '', dl.price * d.mult)
  if (state.crane) add('Livraison', CRANE.label, d.n > 1 ? `${d.n} conteneurs` : '', CRANE.price + (d.n - 1) * 800)

  const ht = lines.reduce((s, l) => s + l.amount, 0)
  const tva = ht * VAT
  const weeks = 5 + (d.mult > 1.2 ? 1 : 0) + (d.n > 1 ? 1 : 0) + (state.usage !== 'raw' ? 2 : 0) + ins.weeks + (state.bath !== 'none' ? 1 : 0) +
    (state.endwall === 'glass' ? 1 : 0) + (state.roof === 'solar' ? 1 : 0) + (hasX(state, 'kitchenpro') || hasX(state, 'coldroom') ? 1 : 0)
  return { lines, ht, tva, ttc: ht + tva, surface: d.surface, weeks, dims: d }
}

export const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
