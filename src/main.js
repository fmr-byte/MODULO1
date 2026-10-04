import {
  SIZES, USAGES, CLADDINGS, COLORS, ENDWALLS, ROOFS, INSULATIONS, FLOORS, OPENINGS, TECH, DECK,
  DELIVERIES, CRANE, PAINT_PER_M2, LAYOUTS, ROLES, BATHS, EXTRAS, defaultState, byId, VAT,
} from './catalog.js'
import { dims, layoutOpenings, normalize, advice, price, eur, extrasFor, hasX } from './pricing.js'
import { createViewer } from './scene.js'

const $ = (s) => document.querySelector(s)
const EXTRAS_BY = Object.fromEntries(EXTRAS.map((e) => [e.id, e]))
const num = (n, d = 2) => n.toFixed(d).replace('.', ',')

// ── État (+ partage par URL) ─────────────────────────────────
let state = defaultState()
try {
  const h = location.hash.match(/c=([^&]+)/)
  if (h) state = { ...state, ...JSON.parse(decodeURIComponent(escape(atob(h[1])))) }
} catch (e) { /* lien invalide : config par défaut */ }
state = normalize(state).state

function persist() {
  try { history.replaceState(null, '', '#c=' + btoa(unescape(encodeURIComponent(JSON.stringify(state))))) } catch (e) { /* noop */ }
}

// ── Thème ────────────────────────────────────────────────────
const SVG = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const ICON_SUN = SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')
const ICON_MOON = SVG('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')
const themeBtn = $('#theme')
const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
const paintTheme = () => (themeBtn.innerHTML = isDark() ? ICON_SUN : ICON_MOON)
themeBtn.onclick = () => {
  const t = isDark() ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  try { localStorage.setItem('theme', t) } catch (e) { /* noop */ }
  paintTheme()
}
paintTheme()

// ── Toasts ───────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200)
}

// ── Rendu du panneau d'options ───────────────────────────────
const badge = (n) => (n === 0 ? '<div class="pr inc">Inclus</div>' : `<div class="pr">+ ${eur(n)}</div>`)
const opt = (key, id, cur, title, desc, pr) =>
  `<button class="opt" data-set="${key}" data-val="${id}" aria-pressed="${cur === id}"><b>${title}</b><small>${desc}</small>${pr == null ? '' : badge(pr)}</button>`
const row = (key, on, title, desc, prText) =>
  `<button class="row" data-toggle="${key}" aria-pressed="${!!on}"><span class="t"><b>${title}</b><small>${desc}</small></span><span class="pr">${prText}</span><span class="sw-t"></span></button>`

const ICONS = {
  single: '<svg viewBox="0 0 64 36" width="64" height="36"><rect x="6" y="13" width="52" height="10" rx="1.5" fill="currentColor" opacity=".85"/></svg>',
  double: '<svg viewBox="0 0 64 36" width="64" height="36"><rect x="6" y="8" width="52" height="9.5" rx="1.5" fill="currentColor" opacity=".85"/><rect x="6" y="19" width="52" height="9.5" rx="1.5" fill="currentColor" opacity=".55"/></svg>',
  L: '<svg viewBox="0 0 64 36" width="64" height="36"><rect x="6" y="5" width="52" height="9.5" rx="1.5" fill="currentColor" opacity=".85"/><rect x="48.5" y="16" width="9.5" height="17" rx="1.5" fill="currentColor" opacity=".55"/></svg>',
}

// surcoût d'une disposition par rapport à un conteneur simple (2e conteneur + liaison)
function layoutDelta(id) {
  const a = dims({ ...state, layout: id }), b = dims({ ...state, layout: 'single' })
  const lo = LAYOUTS.find((l) => l.id === id)
  return Math.round(a.baseTotal - b.baseTotal + lo.link * (id === 'double' ? a.L / 6.058 : 1))
}

function panelHTML() {
  const d = dims(state)
  const lay = layoutOpenings(state)
  const p = price(state)
  const s = state
  const m2 = d.surface
  const tips = advice(s)
  const out = []
  const exposed = d.units.filter((u) => u.front !== 'hole').length

  out.push(`<section class="step"><h2><span class="n">1</span>Format &amp; disposition</h2><p class="sub">Dimensions extérieures normalisées ISO.</p>
    <span class="lab">Conteneur</span>
    <div class="opts">${SIZES.map((z) => `<button class="opt" data-set="size" data-val="${z.id}" aria-pressed="${s.size === z.id}">
      <b>${z.label} <span style="font-weight:500;color:var(--muted)">· ${num(z.L)} × ${num(z.W)} × ${num(z.H)} m · ${num((z.L - 0.12) * (z.W - 0.12), 1)} m² utiles</span></b><small>${z.desc}</small><div class="pr">${eur(z.base)}</div></button>`).join('')}</div>
    <span class="lab">Disposition</span>
    <div class="opts c3">${LAYOUTS.map((l) => `<button class="opt lay" data-set="layout" data-val="${l.id}" aria-pressed="${s.layout === l.id}"><span class="ico">${ICONS[l.id]}</span><b>${l.label}</b><small>${l.desc}</small>${badge(layoutDelta(l.id))}</button>`).join('')}</div>
    ${s.layout !== 'single' ? `<div class="warn" style="background:var(--soft);border-color:var(--border)">Surface totale : <b>${num(m2, 1)} m²</b> · ${d.n} conteneurs${s.layout === 'L' ? ' (module annexe 20’ inclus)' : ''}.</div>` : ''}
  </section>`)

  const roles = ROLES.filter((r) => r.usage === s.usage)
  out.push(`<section class="step"><h2><span class="n">2</span>Usage</h2><p class="sub">Détermine l'aménagement intérieur livré.</p>
    <div class="opts c3">${USAGES.map((u) => opt('usage', u.id, s.usage, u.label, u.desc, Math.round(u.perM2 * (s.layout === 'single' ? m2 : d.surfaces[0])))).join('')}</div>
    ${s.layout !== 'single' && roles.length ? `<span class="lab">Affectation du 2e module</span>
    <div class="opts c2">${roles.map((r) => opt('module2', r.id, s.module2, r.label, r.desc, Math.round(r.perM2 * d.surfaces[1]))).join('')}</div>` : ''}
    ${tips.length ? tips.map((t) => `<div class="warn">${t}</div>`).join('') : ''}</section>`)

  const cl = byId(CLADDINGS, s.cladding)
  const col = byId(COLORS, s.color)
  out.push(`<section class="step"><h2><span class="n">3</span>Extérieur</h2>
    <span class="lab">Bardage</span>
    <div class="opts c2">${CLADDINGS.map((c) => opt('cladding', c.id, s.cladding, c.label, c.desc, Math.round(c.perM2 * d.extWalls))).join('')}</div>
    ${cl.colors ? `<span class="lab">Couleur</span><div class="sws">${COLORS.map((c) => `<button class="sw" data-set="color" data-val="${c.id}" aria-pressed="${s.color === c.id}" aria-label="${c.label}" title="${c.label}" style="background:${c.hex}"></button>`).join('')}</div>
    <div class="swname">${col.label} · ${col.free ? 'teinte d’origine incluse' : `peinture marine + ${eur(PAINT_PER_M2 * d.extWalls)}`}</div>` : ''}
    <span class="lab">Toiture</span>
    <div class="opts c3">${ROOFS.map((r) => opt('roof', r.id, s.roof, r.label, r.desc, Math.round(r.perM2 * d.roofArea + (r.fixedBySize ? d.units.reduce((a, u) => a + r.fixedBySize[u.sizeId], 0) : 0)))).join('')}</div>
    <span class="lab">Pignon${exposed > 1 ? 's' : ''} avant</span>
    <div class="opts c3">${ENDWALLS.map((e) => opt('endwall', e.id, s.endwall, e.label, e.desc, e.price * exposed)).join('')}</div>
    <span class="lab">Aménagement extérieur</span>
    ${row('deck', s.deck, DECK.label, `${DECK.desc} · ${Math.round(d.units[d.units.length > 1 && s.layout === 'double' ? 1 : 0].L * DECK.depth)} m²`, '+ ' + eur(DECK.perM2 * d.units[s.layout === 'double' ? 1 : 0].L * DECK.depth))}
  </section>`)

  out.push(`<section class="step"><h2><span class="n">4</span>Ouvertures</h2><p class="sub">Découpe, renfort de structure et pose inclus.</p>
    <div class="row" style="cursor:default"><span class="t"><b>${OPENINGS.window.label}</b><small>${OPENINGS.window.desc} · max ${lay.maxWindows} avec vos choix</small></span>
      <span class="pr">${eur(OPENINGS.window.price)} / pièce</span>
      <span class="stp"><button data-step="windows" data-d="-1" aria-label="Moins de fenêtres" ${s.windows <= 0 ? 'disabled' : ''}>−</button><span>${lay.count}</span><button data-step="windows" data-d="1" aria-label="Plus de fenêtres" ${lay.count >= lay.maxWindows ? 'disabled' : ''}>+</button></span></div>
    ${row('baie', s.baie, OPENINGS.baie.label, OPENINGS.baie.desc, '+ ' + eur(OPENINGS.baie.price))}
    ${row('door', s.door, OPENINGS.door.label, OPENINGS.door.desc, '+ ' + eur(OPENINGS.door.price))}
  </section>`)

  out.push(`<section class="step"><h2><span class="n">5</span>Intérieur &amp; confort</h2>
    <span class="lab">Isolation</span>
    <div class="opts c3">${INSULATIONS.map((i) => opt('insulation', i.id, s.insulation, i.label, i.desc, Math.round(i.perM2 * d.envelope))).join('')}</div>
    <span class="lab">Revêtement de sol</span>
    <div class="opts c3">${FLOORS.map((f) => opt('floor', f.id, s.floor, f.label, f.desc, Math.round(f.perM2 * m2))).join('')}</div>
    <span class="lab">Salle d'eau &amp; sanitaires</span>
    <div class="opts c2">${BATHS.map((b) => opt('bath', b.id, s.bath, b.label, b.desc, b.price)).join('')}</div>
    <span class="lab">Technique</span>
    ${row('electric', s.electric, TECH.electric.label, TECH.electric.desc, '+ ' + eur(Math.max(TECH.electric.minimum, TECH.electric.perM2 * m2)))}
    ${row('hvac', s.hvac, TECH.hvac.label, TECH.hvac.desc + (d.mult > 1.2 ? ' · multi-split' : '') + ' · nécessite l’électricité', '+ ' + eur(TECH.hvac.price * d.mult))}
  </section>`)

  const ex = extrasFor(s.usage)
  if (ex.length) {
    out.push(`<section class="step"><h2><span class="n">6</span>Options ${s.usage === 'home' ? 'logement' : 'local commercial'}</h2><p class="sub">Sélection adaptée à votre usage — chaque option apparaît dans la 3D.</p>
      ${ex.map((e) => row('x:' + e.id, hasX(s, e.id), e.label, e.desc + (e.requires ? ' · ajoute automatiquement les prérequis' : ''), '+ ' + eur(e.perOpening ? e.perOpening * lay.openings : e.price))).join('')}
    </section>`)
  }

  out.push(`<section class="step"><h2><span class="n">${ex.length ? 7 : 6}</span>Livraison</h2>
    <div class="opts c2">${DELIVERIES.map((x) => opt('delivery', x.id, s.delivery, x.label, d.n > 1 ? `${d.n} conteneurs` : '', Math.round(x.price * d.mult))).join('')}</div>
    <span class="lab">Mise en place</span>
    ${row('crane', s.crane, CRANE.label, CRANE.desc + (d.n > 1 ? ` · ${d.n} conteneurs` : ''), '+ ' + eur(CRANE.price + (d.n - 1) * 800))}
  </section>`)

  const groups = {}
  p.lines.forEach((l) => (groups[l.group] ||= []).push(l))
  out.push(`<section class="step sum"><h2>Récapitulatif</h2>
    ${Object.entries(groups).map(([g, ls]) => `<div class="g">${g}</div>${ls.map((l) => `<div class="l"><span>${l.label}${l.detail ? `<small>${l.detail}</small>` : ''}</span><span>${eur(l.amount)}</span></div>`).join('')}`).join('')}
    <div class="tot" style="margin-top:12px"><span>Total HT</span><span>${eur(p.ht)}</span></div>
    <div class="tot"><span>TVA ${VAT * 100} %</span><span>${eur(p.tva)}</span></div>
    <div class="tot big"><span>Total TTC</span><span>${eur(p.ttc)}</span></div>
    <div class="delay">Délai de fabrication indicatif : <b>${p.weeks} à ${p.weeks + 2} semaines</b> · ${eur(p.ttc / p.surface)} TTC / m²</div>
  </section>`)
  return out.join('')
}

const panelEl = $('#panel')
function renderPanel() {
  const y = window.scrollY
  const focus = document.activeElement?.dataset ? { ...document.activeElement.dataset } : null
  panelEl.innerHTML = panelHTML()
  if (focus && (focus.set || focus.toggle || focus.step)) {
    const sel = focus.set ? `[data-set="${focus.set}"][data-val="${focus.val}"]` : focus.toggle ? `[data-toggle="${focus.toggle}"]` : `[data-step="${focus.step}"][data-d="${focus.d}"]`
    panelEl.querySelector(sel)?.focus({ preventScroll: true })
  }
  window.scrollTo(0, y)
}

function refresh(notes = []) {
  const n = normalize(state)
  state = n.state
  ;[...notes, ...n.notes].forEach(toast)
  const p = price(state)
  const d = p.dims
  $('#total').textContent = eur(p.ttc)
  $('#totalSub').textContent = `${eur(p.ht)} HT · ${num(p.surface, 1)} m² utiles`
  $('#chip').textContent = d.n > 1 ? `${d.n} conteneurs · ${LAYOUTS.find((l) => l.id === state.layout).label} · ${num(d.surface, 1)} m²` : `${d.label} · ${num(d.L)} × ${num(d.W)} × ${num(d.H)} m`
  viewer.update(state)
  renderPanel()
  persist()
}

panelEl.addEventListener('click', (e) => {
  const t = e.target.closest('[data-set],[data-toggle],[data-step]')
  if (!t) return
  const notes = []
  if (t.dataset.set) state[t.dataset.set] = t.dataset.val
  else if (t.dataset.toggle) {
    const k = t.dataset.toggle
    if (k.startsWith('x:')) { const id = k.slice(2); state.x = { ...state.x, [id]: !state.x[id] }; if (!state.x[id]) delete state.x[id] }
    else state[k] = !state[k]
    const needsElec = (id) => (EXTRAS_BY[id]?.requires || []).includes('electric')
    if (k === 'deck' && !state.deck && state.x.pergola) { delete state.x.pergola; notes.push('Pergola retirée (elle nécessite la terrasse).') }
    if (k === 'electric' && !state.electric && (state.hvac || state.bath !== 'none' || state.roof === 'solar' || Object.keys(state.x).some(needsElec))) {
      state.hvac = false; state.bath = 'none'
      if (state.roof === 'solar') state.roof = 'steel'
      Object.keys(state.x).forEach((id) => { if (needsElec(id)) delete state.x[id] })
      notes.push('Clim, sanitaires, solaire et équipements électriques retirés (ils nécessitent l\u2019électricité).')
    }
  } else if (t.dataset.step) {
    const lay = layoutOpenings(state)
    state.windows = Math.max(0, Math.min(lay.maxWindows, lay.count + Number(t.dataset.d)))
  }
  refresh(notes)
})

// ── Vue 3D ───────────────────────────────────────────────────
const viewer = createViewer($('#viewer'))
window.__viewer = viewer
document.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b))
  viewer.setCut(b.dataset.view === 'cut')
}))
$('#rot').onclick = (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); viewer.setAutoRotate(on) }
$('#reset').onclick = () => viewer.resetView()
$('#share').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Lien de la configuration copié') } catch (e) { toast('Copiez l’URL de la barre d’adresse') }
}

// ── Devis ────────────────────────────────────────────────────
const dlg = $('#quote')
function recapHTML(p, img) {
  const groups = {}
  p.lines.forEach((l) => (groups[l.group] ||= []).push(l))
  return `${img ? `<img src="${img}" alt="Aperçu de votre configuration">` : ''}
    <div class="sum">${Object.entries(groups).map(([g, ls]) => `<div class="g">${g}</div>${ls.map((l) => `<div class="l"><span>${l.label}</span><span>${eur(l.amount)}</span></div>`).join('')}`).join('')}
    <div class="tot" style="margin-top:10px"><span>Total HT</span><span>${eur(p.ht)}</span></div>
    <div class="tot"><span>TVA ${VAT * 100} %</span><span>${eur(p.tva)}</span></div>
    <div class="tot big"><span>Total TTC</span><span>${eur(p.ttc)}</span></div></div>`
}

$('#quoteBtn').onclick = () => {
  const p = price(state)
  const img = viewer.snapshot()
  const d = p.dims
  $('#qBody').innerHTML = `
    <div class="q-side"><h3>Votre configuration</h3><p class="s" style="color:var(--muted);margin:0 0 14px;font-size:14px">${d.n > 1 ? d.n + ' conteneurs · ' : ''}${d.label} · ${num(p.surface, 1)} m² utiles</p>${recapHTML(p, img)}</div>
    <div class="q-form"><h3>Recevoir mon devis détaillé</h3><p class="s">Un conseiller vous répond sous 24 h ouvrées.</p>
      <form id="qForm">
        <div class="f2"><label class="f">Prénom<input name="fn" required autocomplete="given-name"></label><label class="f">Nom<input name="ln" required autocomplete="family-name"></label></div>
        <div class="f2"><label class="f">E-mail<input name="em" type="email" required autocomplete="email"></label><label class="f">Téléphone<input name="tel" type="tel" required autocomplete="tel" placeholder="06 12 34 56 78"></label></div>
        <div class="f2"><label class="f">Société <span style="font-weight:500">(facultatif)</span><input name="co" autocomplete="organization"></label><label class="f">Ville de livraison<input name="city" required autocomplete="address-level2"></label></div>
        <div class="f2"><label class="f">Projet<select name="proj"><option>Logement principal</option><option>Résidence secondaire / location</option><option>Local commercial</option><option>Bureau / atelier</option><option>Autre</option></select></label>
          <label class="f">Échéance<select name="when"><option>Dès que possible</option><option>Sous 3 mois</option><option>Sous 6 mois</option><option>Je me renseigne</option></select></label></div>
        <label class="f">Message<textarea name="msg" placeholder="Terrain, contraintes d'accès, démarches, questions…"></textarea></label>
        <label class="chk"><input type="checkbox" required> J'accepte d'être recontacté au sujet de ce devis (démo : aucune donnée n'est envoyée).</label>
        <button class="btn btn-primary" type="submit">Envoyer ma demande de devis</button>
      </form></div>`
  dlg.showModal()
  $('#qForm').onsubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const btn = e.target.querySelector('button[type=submit]')
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Envoi en cours…'
    setTimeout(() => {
      const ref = 'DEV-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000))
      $('#qBody').innerHTML = `<div class="ok"><div class="ic">${SVG('<path d="M5 12.5l4.5 4.5L19 7"/>')}</div><h3>Merci ${fd.get('fn')}, votre demande est envoyée</h3>
        <div class="ref">${ref}</div>
        <p>Un récapitulatif a été « envoyé » à <b>${fd.get('em')}</b>. Un conseiller vous contactera sous 24 h ouvrées pour valider les détails et vous remettre un devis ferme.<br><small>(Démo : aucun e-mail n'a été réellement envoyé.)</small></p>
        <div class="acts"><button class="btn btn-primary" id="pr">Imprimer le récapitulatif</button><button class="btn" id="again">Modifier ma configuration</button></div>
        <div class="recap">${recapHTML(p, img)}<p style="font-size:12.5px;margin-top:12px">Délai de fabrication indicatif : ${p.weeks} à ${p.weeks + 2} semaines.</p></div></div>`
      $('#pr').onclick = () => print()
      $('#again').onclick = () => dlg.close()
    }, 1400)
  }
}
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close() })

refresh()
