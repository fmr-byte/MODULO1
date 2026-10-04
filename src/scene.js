import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { COLORS, MODELS, DECK, BATHS, byId } from './catalog.js'
import { dims, layoutOpenings } from './pricing.js'

const LIFT = 0.25 // hauteur des plots de fondation
const T_WALL = 0.04
const T_LINER = 0.02
const FLOOR_TOP = 0.1

// ── Textures procédurales ────────────────────────────────────
function canvasTex(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()

const TEX = {}
function tex(name) {
  if (TEX[name]) return TEX[name]
  const slope = (t) => (t < 0.2 ? 1 : t >= 0.5 && t < 0.7 ? -1 : 0)
  if (name === 'ridge' || name === 'groove') {
    const vertical = name === 'ridge'
    TEX[name] = canvasTex(vertical ? 256 : 8, vertical ? 8 : 256, (g, w, h) => {
      const n = vertical ? w : h
      for (let i = 0; i < n; i++) {
        const s = slope(i / n) * 0.85
        const nz = Math.sqrt(1 - s * s)
        const col = `rgb(${vertical ? (0.5 - s * 0.5) * 255 : 128},${vertical ? 128 : (0.5 + s * 0.5) * 255},${nz * 255})`
        g.fillStyle = col
        if (vertical) g.fillRect(i, 0, 1, h); else g.fillRect(0, i, w, 1)
      }
    }, { srgb: false, repeat: vertical ? [1 / 0.3, 1] : [1, 1 / 0.2] })
  } else if (name === 'wood' || name === 'deck') {
    const deck = name === 'deck'
    TEX[name] = canvasTex(256, 256, (g, w, h) => {
      const planks = 4
      for (let i = 0; i < planks; i++) {
        const l = 44 + rnd() * 10
        g.fillStyle = `hsl(${deck ? 28 : 31},${deck ? 38 : 45}%,${deck ? l - 6 : l + 4}%)`
        if (deck) g.fillRect(0, (i * h) / planks, w, h / planks - 3)
        else g.fillRect((i * w) / planks, 0, w / planks - 3, h)
        for (let k = 0; k < 26; k++) {
          g.strokeStyle = `rgba(60,35,15,${0.05 + rnd() * 0.1})`
          g.beginPath()
          if (deck) { const y = (i * h) / planks + rnd() * (h / planks - 3); g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 3) }
          else { const x = (i * w) / planks + rnd() * (w / planks - 3); g.moveTo(x, 0); g.lineTo(x + (rnd() - 0.5) * 3, h) }
          g.stroke()
        }
      }
      g.fillStyle = 'rgba(25,15,8,0.85)'
      for (let i = 0; i < planks; i++) { if (deck) g.fillRect(0, ((i + 1) * h) / planks - 3, w, 3); else g.fillRect(((i + 1) * w) / planks - 3, 0, 3, h) }
    }, { repeat: deck ? [1 / 2.4, 1 / 0.6] : [1 / 0.6, 1 / 0.6] })
    if (deck) TEX[name].rotation = 0
  } else if (name === 'corten') {
    TEX[name] = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8a4a27'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = `hsla(${14 + rnd() * 14},${55 + rnd() * 25}%,${22 + rnd() * 24}%,${0.15 + rnd() * 0.25})`
        const r = 2 + rnd() * 9; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill()
      }
    }, { repeat: [1 / 1.2, 1 / 1.2] })
  } else if (name === 'sedum') {
    TEX[name] = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4c7a3a'; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `hsla(${70 + rnd() * 70},${35 + rnd() * 30}%,${25 + rnd() * 30}%,.7)`
        const r = 2 + rnd() * 5; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill()
      }
    }, { repeat: [3, 3] })
  } else if (name === 'solar') {
    TEX[name] = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#10213a'; g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(160,190,230,.55)'; g.lineWidth = 2
      const nx = 6, ny = 10
      for (let i = 0; i <= nx; i++) { g.beginPath(); g.moveTo((i * w) / nx, 0); g.lineTo((i * w) / nx, h); g.stroke() }
      for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, (j * h) / ny); g.lineTo(w, (j * h) / ny); g.stroke() }
    })
  } else if (name === 'ground') {
    TEX[name] = canvasTex(512, 512, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2)
      r.addColorStop(0, 'rgba(170,160,140,.55)'); r.addColorStop(0.55, 'rgba(170,160,140,.25)'); r.addColorStop(1, 'rgba(170,160,140,0)')
      g.fillStyle = r; g.fillRect(0, 0, w, h)
    })
  }
  return TEX[name]
}

const matCache = new Map()
function std(color, opts = {}) {
  const key = color + JSON.stringify(opts)
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts }))
  return matCache.get(key)
}

function shade(hex, f) { return new THREE.Color(hex).multiplyScalar(f) }

function claddingMaterials(state) {
  const col = byId(COLORS, state.color)
  const hex = col.hex
  let wall, frame
  switch (state.cladding) {
    case 'wood':
      wall = new THREE.MeshStandardMaterial({ map: tex('wood'), roughness: 0.85, side: THREE.DoubleSide })
      frame = std('#2b2d30', { metalness: 0.5, roughness: 0.5 }); break
    case 'corten':
      wall = new THREE.MeshStandardMaterial({ map: tex('corten'), normalMap: tex('ridge'), normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.75, metalness: 0.35, side: THREE.DoubleSide })
      frame = std('#5a3220', { metalness: 0.4, roughness: 0.7 }); break
    case 'composite':
      wall = new THREE.MeshStandardMaterial({ color: hex, normalMap: tex('groove'), normalScale: new THREE.Vector2(1, 1), roughness: 0.4, metalness: 0.45, side: THREE.DoubleSide })
      frame = std('#222427', { metalness: 0.6, roughness: 0.4 }); break
    default:
      wall = new THREE.MeshStandardMaterial({ color: hex, normalMap: tex('ridge'), normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })
      frame = new THREE.MeshStandardMaterial({ color: shade(hex, 0.75), roughness: 0.5, metalness: 0.45 })
  }
  const door = state.cladding === 'steel' ? wall : new THREE.MeshStandardMaterial({ color: state.cladding === 'corten' ? '#6b3a22' : '#2f3236', normalMap: tex('ridge'), normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.5, metalness: 0.4 })
  const roof = new THREE.MeshStandardMaterial({ color: state.cladding === 'steel' || state.cladding === 'composite' ? shade(hex, 0.9) : '#8a8d90', normalMap: tex('ridge'), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.55, metalness: 0.5 })
  return { wall, frame, door, roof }
}

const GLASS = new THREE.MeshPhysicalMaterial({ color: '#a9cde0', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
const ALU = new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.4, metalness: 0.7 })
const LINER = new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.9, side: THREE.DoubleSide })

function floorMaterial(id) {
  if (id === 'oak') return new THREE.MeshStandardMaterial({ map: tex('deck'), color: '#f0d3a8', roughness: 0.55 })
  if (id === 'concrete') return std('#9c9b97', { roughness: 0.35, metalness: 0.05 })
  return std('#8d6e4a', { roughness: 0.8 })
}

// ── Primitives ───────────────────────────────────────────────
function box(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? std(mat) : mat)
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true
  parent.add(m); return m
}
function cyl(parent, r, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), typeof mat === 'string' ? std(mat) : mat)
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m
}

// panneau plan extrudé avec trous (x centré, y de 0 à h)
function panel(w, h, holes, depth, mat) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath()
  holes.forEach((o) => {
    const p = new THREE.Path()
    const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = o.y0, y1 = o.y0 + o.h
    p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath()
    s.holes.push(p)
  })
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat)
  m.castShadow = m.receiveShadow = true
  return m
}

// vitrage + cadre dans le repère local d'un mur (x local, y mur, z = face extérieure)
function glazing(o, zOut, kind) {
  const g = new THREE.Group()
  const f = 0.05, d = 0.07
  const zc = zOut - 0.03
  box(g, o.w + 0.02, f, d, ALU, o.x, o.y0 + o.h - f / 2, zc)
  box(g, o.w + 0.02, f, d, ALU, o.x, o.y0 + f / 2, zc)
  box(g, f, o.h, d, ALU, o.x - o.w / 2 + f / 2, o.y0 + o.h / 2, zc)
  box(g, f, o.h, d, ALU, o.x + o.w / 2 - f / 2, o.y0 + o.h / 2, zc)
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(o.w - f, o.h - f), GLASS)
  pane.position.set(o.x, o.y0 + o.h / 2, zc); g.add(pane)
  if (kind === 'baie') {
    box(g, 0.06, o.h, 0.09, ALU, o.x, o.y0 + o.h / 2, zc + 0.01)
    box(g, 0.03, 0.4, 0.05, ALU, o.x - 0.1, o.y0 + o.h * 0.5, zc + 0.06)
  } else if (kind === 'door') {
    box(g, 0.03, 0.8, 0.05, ALU, o.x + o.w / 2 - 0.12, o.y0 + 1.0, zc + 0.05)
  } else {
    box(g, o.w, 0.03, 0.05, ALU, o.x, o.y0 + o.h / 2, zc)
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = m.material !== GLASS })
  return g
}

// ── Modèles externes optionnels ──────────────────────────────
const gltfLoader = new GLTFLoader()
function applyModel(key, group) {
  const cfg = MODELS[key]
  if (!cfg || !cfg.url) return
  gltfLoader.load(cfg.url, (gltf) => {
    const m = gltf.scene
    m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true } })
    if (cfg.position) m.position.set(...cfg.position)
    if (cfg.rotation) m.rotation.set(...cfg.rotation)
    if (cfg.scale) m.scale.setScalar(cfg.scale)
    group.children.slice().forEach((c) => (c.visible = false))
    group.add(m)
  }, undefined, () => console.warn('[MODELS] asset introuvable :', cfg.url))
}

// ── Construction de l'enveloppe (par conteneur) ──────────────
// repère local d'un conteneur : L sur x, W sur z, côté A = +z, pignon avant = +x
function buildShell(u, state, lay, lined) {
  const { L, W, H } = u
  const mats = claddingMaterials(state)
  const shell = new THREE.Group()
  const shutters = !!state.x?.shutters

  const frame = new THREE.Group(); frame.name = 'frame'; shell.add(frame)
  const fm = mats.frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(frame, 0.12, H, 0.12, fm, sx * (L / 2 - 0.06), H / 2, sz * (W / 2 - 0.06))
    for (const y of [0.08, H - 0.08]) box(frame, 0.18, 0.16, 0.17, std('#1b1c1e', { metalness: 0.7, roughness: 0.45 }), sx * (L / 2 - 0.09), y, sz * (W / 2 - 0.085))
  }
  for (const y of [0.05, H - 0.05]) {
    for (const sz of [-1, 1]) box(frame, L - 0.2, 0.1, 0.1, fm, 0, y, sz * (W / 2 - 0.05))
    for (const sx of [-1, 1]) box(frame, 0.1, 0.1, W - 0.2, fm, sx * (L / 2 - 0.05), y, 0)
  }

  const wallH = H - 0.2
  for (const side of ['A', 'B']) {
    if ((side === 'A' && u.openA) || (side === 'B' && u.openB)) continue
    const g = new THREE.Group(); g.name = 'side' + side
    const sgn = side === 'A' ? 1 : -1
    g.rotation.y = side === 'A' ? 0 : Math.PI
    const ops = lay[side]
    const holes = ops.map((o) => ({ x: sgn * o.x, w: o.w, y0: o.y0 - 0.1, h: o.h }))
    const wall = panel(L - 0.2, wallH, holes, T_WALL, mats.wall)
    wall.position.set(0, 0.1, W / 2 - 0.02 - T_WALL); g.add(wall)
    if (lined) {
      const liner = panel(L - 0.3, wallH - 0.1, holes, T_LINER, LINER)
      liner.position.set(0, 0.15, W / 2 - 0.1 - T_LINER); liner.castShadow = false; g.add(liner)
    }
    ops.forEach((o) => {
      if (o.kind === 'link') return
      g.add(glazing({ ...o, x: sgn * o.x }, W / 2 - 0.02, o.kind))
      if (shutters && o.kind !== 'door') {
        box(g, o.w + 0.12, 0.2, 0.13, '#2d3034', sgn * o.x, o.y0 + o.h + 0.14, W / 2 + 0.03)
        for (let k = 0; k < 3; k++) box(g, o.w + 0.1, 0.012, 0.015, '#4a4f55', sgn * o.x, o.y0 + o.h - 0.05 - k * 0.02, W / 2 - 0.01)
      }
    })
    shell.add(g)
  }

  const makeEnd = (sgn) => {
    const g = new THREE.Group(); g.name = sgn > 0 ? 'endFront' : 'endBack'
    g.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2
    const kind = sgn > 0 ? u.front : 'solid'
    const isGlass = kind === 'glass'
    const isHole = kind === 'hole'
    const lwid = (W - 0.36) / 2
    const doorX = -(lwid / 2 + 0.006) // vantail côté A (opposé à la cuisine)
    const holes = isGlass ? [{ x: 0, w: W - 0.45, y0: 0.2, h: H - 0.65 }] : isHole ? [{ x: 0, w: W - 0.5, y0: 0.2, h: H - 0.45 }]
      : sgn > 0 && u.frontDoor ? [{ x: kind === 'cargo' ? doorX : 0, w: 0.85, y0: 0.2, h: 1.95 }] : []
    const wall = panel(W - 0.2, wallH, holes, T_WALL, mats.wall)
    wall.position.set(0, 0.1, L / 2 - 0.02 - T_WALL); g.add(wall)
    if (lined) {
      const liner = panel(W - 0.3, wallH - 0.1, holes, T_LINER, LINER)
      liner.position.set(0, 0.15, L / 2 - 0.1 - T_LINER); liner.castShadow = false; g.add(liner)
    }
    if (isGlass) {
      const o = holes[0]
      g.add(glazing({ kind: 'win', x: 0, w: o.w, y0: o.y0 + 0.1, h: o.h }, L / 2 - 0.02, 'win'))
      box(g, 0.05, o.h, 0.08, ALU, 0, o.y0 + 0.1 + o.h / 2, L / 2 - 0.05)
    }
    if (sgn > 0 && u.frontDoor) {
      const o = holes[0]
      g.add(glazing({ kind: 'door', x: o.x, w: o.w, y0: 0.3, h: 1.95 }, L / 2 + 0.03, 'door'))
    }
    if (kind === 'cargo') {
      const lw = (W - 0.36) / 2, lh = H - 0.36
      for (const s of [-1, 1]) {
        const withDoor = u.frontDoor && s === -1
        const leaf = panel(lw, lh, withDoor ? [{ x: 0, w: 0.85, y0: 0.12, h: 1.95 }] : [], 0.05, mats.door)
        leaf.position.set(s * (lw / 2 + 0.006), 0.18, L / 2 - 0.02 - 0.01); g.add(leaf)
        if (withDoor) continue
        for (const k of [0.3, 0.75]) cyl(g, 0.016, lh - 0.1, std('#bfc3c7', { metalness: 0.9, roughness: 0.3 }), s * (lw * k + 0.006), 0.18 + lh / 2, L / 2 + 0.05, 10)
        box(g, 0.1, 0.04, 0.05, std('#bfc3c7', { metalness: 0.9, roughness: 0.3 }), s * (lw * 0.52), 1.1, L / 2 + 0.07)
      }
    }
    return g
  }
  shell.add(makeEnd(1), makeEnd(-1))

  const roofG = new THREE.Group(); roofG.name = 'roof'
  const roof = panel(L - 0.2, W - 0.2, [], 0.04, mats.roof)
  roof.rotation.x = -Math.PI / 2; roof.position.set(0, H - 0.08, (W - 0.2) / 2); roofG.add(roof)
  if (lined) box(roofG, L - 0.3, 0.02, W - 0.3, LINER, 0, H - 0.14, 0)
  shell.add(roofG)

  box(shell, L - 0.2, FLOOR_TOP - 0.02, W - 0.2, std('#3c3a37'), 0, (FLOOR_TOP - 0.02) / 2 + 0.02, 0)
  const fl = box(shell, L - 0.24, 0.02, W - 0.24, floorMaterial(state.floor), 0, FLOOR_TOP, 0)
  fl.receiveShadow = true
  fl.material = fl.material.clone()
  if (fl.material.map) { fl.material.map = fl.material.map.clone(); fl.material.map.needsUpdate = true; fl.material.map.repeat.set(L / 2.4, W / 0.6) }
  return shell
}

// ── Extérieur ────────────────────────────────────────────────
function buildPlots(u) {
  const { L, W } = u
  const g = new THREE.Group()
  const n = Math.max(2, Math.round(L / 3) + 1)
  for (let i = 0; i < n; i++) for (const sz of [-1, 1]) box(g, 0.36, LIFT, 0.36, '#8c8b87', -L / 2 + 0.3 + ((L - 0.6) * i) / (n - 1), LIFT / 2, sz * (W / 2 - 0.28))
  return g
}

function buildDeck(u, withPergola) {
  const { L, W } = u
  const g = new THREE.Group()
  const dp = DECK.depth, y = 0
  const dt = tex('deck').clone(); dt.needsUpdate = true; dt.repeat.set(L / 2.4, dp / 0.6)
  box(g, L, 0.08, dp, new THREE.MeshStandardMaterial({ map: dt, roughness: 0.8 }), 0, y - 0.04, 0)
  box(g, L - 0.2, 0.12, dp - 0.2, '#4a3c2e', 0, y - 0.14, 0)
  const wood = std('#7a5a3a', { roughness: 0.8 })
  const zOut = dp / 2 - 0.05
  const n = Math.max(3, Math.round(L / 1.5))
  for (let i = 0; i < n; i++) box(g, 0.06, 0.95, 0.06, wood, -L / 2 + 0.05 + ((L - 0.1) * i) / (n - 1), 0.475 + y, zOut)
  box(g, L, 0.05, 0.09, wood, 0, y + 0.95, zOut)
  box(g, L, 0.03, 0.05, wood, 0, y + 0.5, zOut)
  for (const sx of [-1, 1]) {
    box(g, 0.05, 0.05, dp - 0.1, wood, sx * (L / 2 - 0.03), y + 0.95, 0)
    box(g, 0.06, 0.95, 0.06, wood, sx * (L / 2 - 0.03), y + 0.475, 0)
  }
  if (withPergola) {
    const ph = u.H - 0.35
    const pl = Math.min(L - 0.4, 4.2), px = 0
    for (const sx of [-1, 1]) box(g, 0.12, ph, 0.12, wood, px + sx * (pl / 2), ph / 2, dp / 2 - 0.12)
    box(g, pl + 0.4, 0.14, 0.14, wood, px, ph, dp / 2 - 0.12)
    for (let i = 0; i <= 8; i++) box(g, 0.07, 0.1, dp - 0.1, wood, px - pl / 2 - 0.1 + ((pl + 0.2) * i) / 8, ph + 0.1, 0)
  }
  g.position.set(0, 0, W / 2 + dp / 2 - 0.05)
  return g
}

function stovePos(u) { return { x: u.L / 2 - 0.14 - 0.7, z: u.W / 2 - 0.14 - 0.35 } }

function buildRoofDeco(u, state, isMain) {
  const { L, W, H } = u
  const g = new THREE.Group(); g.name = 'roofdeco'
  const base = H
  if (state.roof === 'green') {
    const m = new THREE.MeshStandardMaterial({ map: tex('sedum').clone(), roughness: 1 })
    m.map.repeat.set(L / 1.2, W / 1.2); m.map.needsUpdate = true
    box(g, L - 0.3, 0.14, W - 0.3, m, 0, base + 0.04, 0)
    box(g, L - 0.2, 0.08, W - 0.2, '#2c2e30', 0, base - 0.02, 0)
  } else if (state.roof === 'solar') {
    const n = Math.max(3, Math.floor(L / 1.95))
    const pm = new THREE.MeshStandardMaterial({ map: tex('solar'), roughness: 0.25, metalness: 0.6 })
    for (let i = 0; i < n; i++) for (const r of [-1, 1]) {
      const pw = 1.7, ph = 1.0
      const x = -((n - 1) * 1.95) / 2 + i * 1.95
      const p = new THREE.Group()
      box(p, pw + 0.06, 0.05, ph + 0.06, '#c9cdd1', 0, 0, 0)
      box(p, pw, 0.055, ph, pm, 0, 0.005, 0)
      p.position.set(x, base + 0.14, r * 0.55)
      p.rotation.x = -r * 0.2
      g.add(p)
      for (const sx of [-0.7, 0.7]) box(g, 0.04, 0.12, 0.04, '#9ea3a8', x + sx, base + 0.06, r * 0.55)
    }
  }
  if (isMain && state.x?.stove) {
    const s = stovePos(u)
    cyl(g, 0.065, 1.1, '#2a2c2f', s.x, base + 0.5, s.z, 14)
    cyl(g, 0.09, 0.08, '#1d1e20', s.x, base + 1.08, s.z, 14)
  }
  if (isMain && state.x?.vmc) {
    box(g, 0.5, 0.22, 0.5, '#aeb3b8', -L / 2 + 1.0, base + 0.11, -W / 4)
    cyl(g, 0.07, 0.25, '#7b8086', -L / 2 + 1.6, base + 0.12, -W / 4 + 0.1, 12)
    cyl(g, 0.07, 0.25, '#7b8086', -L / 2 + 1.8, base + 0.12, W / 4 - 0.1, 12)
  }
  if (isMain && state.x?.kitchenpro) {
    box(g, 0.7, 0.5, 0.7, '#b6babe', L / 2 - 1.6, base + 0.25, -W / 4)
    cyl(g, 0.22, 0.12, '#2b2d30', L / 2 - 1.6, base + 0.55, -W / 4, 18)
  }
  return g
}

function buildHvac(u) {
  const { L, W } = u
  const g = new THREE.Group()
  const x = -L / 2 + 0.55
  box(g, 0.85, 0.6, 0.3, '#e9eaec', x, 0.7, -(W / 2 + 0.17))
  cyl(g, 0.2, 0.04, '#2a2c2f', x, 0.7, -(W / 2 + 0.33), 24).rotation.x = Math.PI / 2
  box(g, 0.9, 0.04, 0.34, '#bfc3c7', x, 1.02, -(W / 2 + 0.17))
  return g
}

// éléments de façade selon les options (enseigne, store, rampe)
function buildFacade(u, state, lay) {
  const { L, W, H } = u
  const g = new THREE.Group()
  const X = state.x || {}
  if (X.sign) {
    const c = canvasTex(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#17181c'; ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffd37a'; ctx.font = '700 64px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('OUVERT · BOUTIQUE', w / 2, h / 2 + 4)
    }, {})
    c.wrapS = c.wrapT = THREE.ClampToEdgeWrapping
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.12), [std('#17181c'), std('#17181c'), std('#17181c'), std('#17181c'),
      new THREE.MeshStandardMaterial({ map: c, emissive: '#ffd37a', emissiveMap: c, emissiveIntensity: 1.1 }), std('#17181c')])
    m.position.set(1.6, H - 0.5, W / 2 + 0.07); g.add(m)
  }
  if (X.awning) {
    const c = canvasTex(256, 64, (ctx, w, h) => {
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f4efe6' : '#c8553d'; ctx.fillRect((i * w) / 8, 0, w / 8, h) }
    }, {})
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.2), new THREE.MeshStandardMaterial({ map: c, side: THREE.DoubleSide, roughness: 0.9 }))
    a.rotation.x = -Math.PI / 2 + 0.38
    a.position.set(-1.3, H - 0.32, W / 2 + 0.55); a.castShadow = true; g.add(a)
    box(g, 2.8, 0.1, 0.1, '#2b2d30', -1.3, H - 0.27, W / 2 + 0.05)
    box(g, 2.8, 0.06, 0.06, '#2b2d30', -1.3, H - 0.55 + 0.12, W / 2 + 1.1)
  }
  if (X.ramp) {
    const ramp = box(g, 3.4, 0.06, 1.1, '#5b5d60', 0, 0, 0)
    ramp.position.set(-L / 2 + 2.6, 0.17, -(W / 2 + 0.6))
    ramp.rotation.z = -Math.atan2(0.35, 3.4)
    box(g, 3.4, 0.4, 0.04, '#2b2d30', -L / 2 + 2.6, 0.55, -(W / 2 + 1.1)).rotation.z = -Math.atan2(0.35, 3.4)
  }
  return g
}

// ── Intérieur ────────────────────────────────────────────────
const C = { white: '#f3f2ee', wood: '#b48d5e', dark: '#2b2d31', fabric: '#6f8392', green: '#4f7a5c', steel: '#b6babe', rack: '#5d6065' }

// bloc sanitaires cloisonné au début de la zone ; retourne le nouveau xs
function bathroom(g, u, xs, type, ctx) {
  const { yF, Hin, hw } = ctx
  const zone = byId(BATHS, type).zone
  const xp = xs + zone
  const bl = new THREE.Group(); bl.name = 'bathroom'
  const gapA = 0.15, gapB = 0.95
  box(bl, 0.07, Hin, gapA + hw, C.white, xp, yF + Hin / 2, (gapA - hw) / 2)
  box(bl, 0.07, Hin, hw - gapB, C.white, xp, yF + Hin / 2, (gapB + hw) / 2)
  box(bl, 0.07, Hin - 2.05, gapB - gapA, C.white, xp, yF + 2.05 + (Hin - 2.05) / 2, (gapA + gapB) / 2)
  const wc = (x, z) => { box(bl, 0.4, 0.4, 0.36, C.white, x, yF + 0.2, z); box(bl, 0.4, 0.5, 0.18, C.white, x, yF + 0.65, z - 0.14) }
  const basin = (x, z, w = 0.6) => { box(bl, w, 0.85, 0.4, C.wood, x, yF + 0.425, z); box(bl, w - 0.1, 0.1, 0.34, C.white, x, yF + 0.9, z); box(bl, w - 0.1, 0.7, 0.03, '#d9e4ea', x, yF + 1.5, z + 0.2) }
  if (type === 'wc') {
    wc(xs + 0.5, -hw + 0.3)
    basin(xs + 0.5, hw - 0.25, 0.5)
  } else if (type === 'shower') {
    box(bl, 0.9, 0.06, 0.9, '#dcdcd8', xs + 0.55, yF + 0.03, -hw + 0.5)
    box(bl, 0.02, 1.95, 0.9, '#bcd8e4', xs + 1.0, yF + 1.0, -hw + 0.5).material = GLASS
    cyl(bl, 0.02, 1.0, '#bfc3c7', xs + 0.12, yF + 1.45, -hw + 0.5)
    wc(xs + 1.25, -hw + 0.3)
    basin(xs + 1.25, hw - 0.25)
  } else if (type === 'tub') {
    box(bl, 0.75, 0.55, 1.75, C.white, xs + 0.45, yF + 0.28, -hw + 0.95)
    box(bl, 0.6, 0.06, 1.55, '#e8f0f4', xs + 0.45, yF + 0.56, -hw + 0.95)
    cyl(bl, 0.02, 0.4, '#bfc3c7', xs + 0.45, yF + 0.75, -hw + 0.2)
    wc(xs + 1.5, -hw + 0.3)
    basin(xs + 1.15, hw - 0.25, 1.1)
    box(bl, 0.5, 0.7, 0.03, '#d9e4ea', xs + 1.55, yF + 1.5, hw - 0.04)
  }
  g.add(bl); applyModel('bathroom', bl)
  return xp + 0.06
}

function sofaSet(g, x, zc, yF, hw) {
  const sofa = new THREE.Group(); sofa.name = 'sofa'
  box(sofa, 1.9, 0.42, 0.85, C.fabric, x, yF + 0.21, zc)
  box(sofa, 1.9, 0.45, 0.2, C.fabric, x, yF + 0.62, zc + 0.33)
  box(sofa, 0.2, 0.3, 0.85, '#5d7080', x - 0.85, yF + 0.5, zc)
  box(sofa, 0.2, 0.3, 0.85, '#5d7080', x + 0.85, yF + 0.5, zc)
  box(sofa, 1.0, 0.03, 0.55, C.green, x, yF + 0.025, zc - 0.55)
  g.add(sofa); applyModel('sofa', sofa)
}
function bed(g, x, z, yF, w = 1.4, name) {
  const b = new THREE.Group(); if (name) b.name = name
  box(b, 2.0, 0.35, w, C.wood, x, yF + 0.18, z)
  box(b, 1.95, 0.22, w - 0.05, '#e8e6e0', x, yF + 0.46, z)
  box(b, 0.4, 0.12, 0.55, C.white, x - 0.75, yF + 0.64, z - (w > 1 ? 0.3 : 0))
  if (w > 1) box(b, 0.4, 0.12, 0.55, C.white, x - 0.75, yF + 0.64, z + 0.3)
  box(b, 0.08, 0.9, w + 0.1, C.wood, x - 1.04, yF + 0.45, z)
  g.add(b); if (name) applyModel(name, b)
}
function shelves(g, x0, n, zc, yF, color = C.wood) {
  const sh = new THREE.Group(); sh.name = 'shelf'
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 1.25
    box(sh, 0.04, 2.0, 0.35, C.dark, x - 0.57, yF + 1.0, zc)
    for (const y of [0.05, 0.55, 1.05, 1.55, 2.0]) box(sh, 1.15, 0.04, 0.35, color, x, yF + y, zc)
    for (const [y, c] of [[0.1, '#c8553d'], [0.6, '#e0b04a'], [1.1, '#4f7a5c'], [1.6, '#6f8392']]) for (let k = 0; k < 3; k++) box(sh, 0.25, 0.3, 0.2, c, x - 0.35 + k * 0.35, yF + y + 0.17, zc)
  }
  g.add(sh); applyModel('shelf', sh)
}
function desk(g, x, z, yF, rot = 0) {
  const d = new THREE.Group()
  box(d, 1.5, 0.04, 0.7, C.wood, 0, yF + 0.74, 0)
  box(d, 0.05, 0.72, 0.65, C.dark, -0.7, yF + 0.37, 0); box(d, 0.05, 0.72, 0.65, C.dark, 0.7, yF + 0.37, 0)
  box(d, 0.5, 0.3, 0.03, C.dark, 0, yF + 1.02, -0.15); box(d, 0.08, 0.2, 0.04, C.dark, 0, yF + 0.86, -0.15)
  box(d, 0.5, 0.05, 0.5, C.dark, 0, yF + 0.45, 0.7); box(d, 0.5, 0.45, 0.06, C.dark, 0, yF + 0.72, 0.93)
  d.position.set(x, 0, z); d.rotation.y = rot; g.add(d)
}
function stainless(g, x, z, w, d, yF, h = 0.9) {
  box(g, w, h, d, '#9aa0a6', x, yF + h / 2, z).material = std('#aeb3b8', { metalness: 0.85, roughness: 0.3 })
  box(g, w + 0.02, 0.04, d + 0.02, '#c9cdd1', x, yF + h + 0.02, z).material = std('#c9cdd1', { metalness: 0.9, roughness: 0.25 })
}
function hood(g, x, z, yF, Hin) {
  box(g, 1.4, 0.35, 0.8, '#aeb3b8', x, yF + Hin - 0.55, z).material = std('#aeb3b8', { metalness: 0.85, roughness: 0.3 })
  box(g, 0.35, 0.5, 0.35, '#aeb3b8', x, yF + Hin - 0.1, z)
}
function stool(g, x, z, yF) { cyl(g, 0.17, 0.04, C.dark, x, yF + 0.65, z, 14); cyl(g, 0.025, 0.63, '#7d8288', x, yF + 0.32, z, 8) }

function buildInterior(u, ctx) {
  const { state, role, X } = ctx
  const { L, W, H } = u
  const g = new THREE.Group()
  const hw = W / 2 - 0.14
  const yF = FLOOR_TOP + 0.01
  const Hin = H - 0.16 - yF
  Object.assign(ctx, { yF, Hin, hw })
  let xs = -L / 2 + 0.14
  const xe = L / 2 - 0.14
  if (ctx.bath && ctx.bath !== 'none') xs = bathroom(g, u, xs, ctx.bath, ctx)
  const R = xe - xs
  const zA = hw, zB = -hw

  if (role === 'main' && state.usage === 'home') {
    const kit = new THREE.Group(); kit.name = 'kitchen'
    const kx = xe - 1.75
    box(kit, 2.0, 0.9, 0.6, C.white, kx, yF + 0.45, zB + 0.3)
    box(kit, 2.0, 0.04, 0.64, '#4b4d52', kx, yF + 0.92, zB + 0.31)
    box(kit, 2.0, 0.7, 0.35, C.wood, kx, yF + 1.7, zB + 0.18)
    box(kit, 0.6, 0.02, 0.5, C.steel, kx - 0.4, yF + 0.945, zB + 0.31).material = std('#9fa3a8', { metalness: 0.8, roughness: 0.3 })
    box(kit, 0.6, 1.85, 0.62, '#d8dadc', xe - 0.35, yF + 0.925, zB + 0.31)
    g.add(kit); applyModel('kitchen', kit)
    let cx = xs
    let wx0 = xs
    if (R >= 5.5 && ctx.single) {
      bed(g, cx + 1.1, zB + 0.75, yF, 1.4, 'bed')
      cx += 2.5
      wx0 = xs + 2.2
    }
    // armoire / dressing : contre le mur opposé à la baie (côté B)
    const kStart = xe - 2.75
    const free = kStart - wx0
    if (X.wardrobe) {
      if (free >= 1.0) { const w = Math.min(2.2, free - 0.1); box(g, w, 2.2, 0.55, C.wood, wx0 + 0.05 + w / 2, yF + 1.1, zB + 0.28); box(g, 0.02, 2.1, 0.02, C.dark, wx0 + 0.05 + w / 2, yF + 1.1, zB + 0.57) }
      else { box(g, 0.55, 2.2, 1.6, C.wood, xs + 0.28, yF + 1.1, zB + 0.9) }
    } else if (R >= 5.5 && ctx.single) box(g, 0.5, 1.9, 0.6, C.wood, xs + 2.4, yF + 0.95, zB + 0.3)
    const sofaNeed = ctx.single ? 1.9 : 1.9
    if (xe - 2.4 - cx >= sofaNeed) { sofaSet(g, cx + 1.0, zA - 0.5, yF, hw); cx += 2.0 }
    if (X.island) {
      const ix = Math.min(xe - 2.6, Math.max(cx + 0.9, xs + 1.0))
      box(g, 1.6, 0.9, 0.85, C.white, ix, yF + 0.45, 0.1)
      box(g, 1.7, 0.05, 0.95, '#4b4d52', ix, yF + 0.93, 0.1)
      stool(g, ix - 0.4, 0.78, yF); stool(g, ix + 0.4, 0.78, yF)
    } else if (xe - 2.4 - cx >= 1.2) {
      box(g, 0.9, 0.04, 0.9, C.wood, cx + 0.6, yF + 0.74, 0.05)
      cyl(g, 0.04, 0.72, C.dark, cx + 0.6, yF + 0.36, 0.05)
      for (const dz of [-0.6, 0.7]) box(g, 0.4, 0.45, 0.4, '#d9d6cf', cx + 0.6, yF + 0.225, 0.05 + dz)
    }
    if (X.stove) {
      const s = stovePos(u)
      box(g, 0.8, 0.02, 0.8, '#4a4d52', s.x, yF + 0.01, s.z)
      cyl(g, 0.22, 0.75, C.dark, s.x, yF + 0.4, s.z, 16)
      cyl(g, 0.065, Hin - 0.9, C.dark, s.x, yF + 0.78 + (Hin - 0.9) / 2, s.z, 12)
    }
  } else if (role === 'main' && state.usage === 'shop') {
    const counter = new THREE.Group(); counter.name = 'counter'
    box(counter, 0.7, 1.0, 1.7, C.white, xe - 0.8, yF + 0.5, 0.2)
    box(counter, 0.78, 0.05, 1.78, C.wood, xe - 0.8, yF + 1.02, 0.2)
    box(counter, 0.3, 0.22, 0.25, C.dark, xe - 0.8, yF + 1.15, 0.5)
    g.add(counter); applyModel('counter', counter)
    const kp = X.kitchenpro
    const nShelf = Math.max(0, Math.floor((R - 2.6) / 1.25) - (kp ? 2 : 0))
    if (nShelf) shelves(g, xs + 0.7, nShelf, zB + 0.2, yF)
    if (kp) {
      const cx0 = xs + R / 2 - 0.3
      stainless(g, cx0, zB + 0.35, 2.6, 0.7, yF)
      hood(g, cx0 + 0.5, zB + 0.4, yF, Hin)
      stainless(g, xs + 0.8, zA - 0.35, 1.2, 0.7, yF)
    }
    if (X.bar) {
      const bx = xs + R * 0.38
      box(g, 2.0, 1.0, 0.5, C.white, bx, yF + 0.5, zA - 0.35)
      box(g, 2.1, 0.05, 0.62, C.wood, bx, yF + 1.02, zA - 0.35)
      for (let i = 0; i < 3; i++) stool(g, bx - 0.6 + i * 0.6, zA - 0.9, yF)
    }
    if (X.fridge) {
      const fx = xs + R * 0.35
      for (let i = 0; i < 2; i++) {
        box(g, 1.2, 1.2, 0.7, '#cfd3d6', fx + i * 1.3, yF + 0.6, zB + 0.4)
        box(g, 1.15, 0.5, 0.02, '#bcd8e4', fx + i * 1.3, yF + 0.9, zB + 0.76).material = GLASS
        for (let k = 0; k < 3; k++) box(g, 0.2, 0.16, 0.2, ['#c8553d', '#e0b04a', '#4f7a5c'][k], fx + i * 1.3 - 0.3 + k * 0.3, yF + 0.95, zB + 0.45)
      }
    }
    if (X.coldroom) {
      box(g, 1.8, 2.1, 1.8, '#dfe3e6', xs + 1.1, yF + 1.05, zA - 1.0)
      box(g, 0.04, 1.8, 0.8, '#aeb3b8', xs + 1.1 + 0.9, yF + 0.95, zA - 1.0)
    }
    const nTab = Math.max(1, Math.floor((R - 2.8) / 1.9))
    if (!X.bar && !kp) for (let i = 0; i < nTab; i++) {
      const x = xs + 1.0 + i * 1.9
      box(g, 0.9, 0.9, 0.9, C.wood, x, yF + 0.45, 0.45)
      box(g, 0.4, 0.3, 0.3, '#e0b04a', x, yF + 1.05, 0.45)
    }
    const rail = box(g, R - 0.4, 0.04, 0.06, '#fff7e0', (xs + xe) / 2, H - 0.2, 0)
    rail.material = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffe3a1', emissiveIntensity: 1.4 })
  } else if (role === 'bedroom') {
    bed(g, xs + 1.1, zB + 0.8, yF, 1.5, 'bed')
    for (const dz of [-1, 1]) box(g, 0.4, 0.45, 0.4, C.wood, xs + 0.3, yF + 0.23, zB + 0.8 + dz * 1.0)
    box(g, 1.6, 2.2, 0.55, C.wood, xe - 0.95, yF + 1.1, zB + 0.28)
    box(g, 1.6, 0.03, 1.1, C.green, xs + 1.5, yF + 0.025, 0.1)
  } else if (role === 'kids') {
    const mid = (xs + xe) / 2
    const dz = 2 * hw - 0.95
    box(g, 0.07, Hin, dz, C.white, mid, yF + Hin / 2, zB + dz / 2)
    box(g, 0.07, Hin - 2.05, 0.8, C.white, mid, yF + 2.05 + (Hin - 2.05) / 2, zB + dz + 0.4)
    bed(g, xs + 1.1, zB + 0.8, yF, 1.4)
    bed(g, mid + 1.1, zB + 0.8, yF, 1.4)
    box(g, 1.6, 2.2, 0.55, C.wood, xs + 1.2, yF + 1.1, zA - 0.28)
    box(g, 1.6, 2.2, 0.55, C.wood, mid + 1.2, yF + 1.1, zA - 0.28)
  } else if (role === 'wet' && state.usage === 'home') {
    // salle d'eau & buanderie : bloc buanderie + double vasque
    box(g, 0.65, 0.9, 0.65, C.white, xs + 0.5, yF + 0.45, zA - 0.4); box(g, 0.65, 0.9, 0.65, '#e4e6e8', xs + 0.5, yF + 1.35, zA - 0.4)
    box(g, 1.5, 0.85, 0.5, C.wood, xs + 2.0, yF + 0.425, zA - 0.3)
    box(g, 0.5, 0.1, 0.4, C.white, xs + 1.6, yF + 0.9, zA - 0.3); box(g, 0.5, 0.1, 0.4, C.white, xs + 2.4, yF + 0.9, zA - 0.3)
    box(g, 1.4, 0.8, 0.03, '#d9e4ea', xs + 2.0, yF + 1.5, zA - 0.04)
    box(g, 0.5, 1.7, 0.08, '#c9cdd1', xe - 0.3, yF + 1.0, zB + 0.2)
    box(g, 1.0, 0.4, 0.4, C.wood, xs + 2.2, yF + 0.2, zB + 0.35)
  } else if (role === 'wet' && state.usage === 'shop') {
    stainless(g, xe - 1.2, zB + 0.3, 1.8, 0.6, yF)
    box(g, 0.6, 1.8, 0.62, '#d8dadc', xe - 0.35, yF + 0.9, zA - 0.35)
    box(g, 0.9, 0.04, 0.9, C.wood, xs + R / 2, yF + 0.74, 0.05); cyl(g, 0.04, 0.72, C.dark, xs + R / 2, yF + 0.36, 0.05)
    for (const dz of [-0.6, 0.7]) box(g, 0.4, 0.45, 0.4, '#d9d6cf', xs + R / 2, yF + 0.225, 0.05 + dz)
  } else if (role === 'office') {
    desk(g, xs + 1.0, zA - 0.45, yF)
    sofaSet(g, xe - 1.2, zB + 0.5, yF, hw)
    shelves(g, xs + 0.8, Math.max(1, Math.floor((R - 1.0) / 2.5)), zB + 0.2, yF)
  } else if (role === 'sales') {
    shelves(g, xs + 0.7, Math.max(1, Math.floor((R - 0.8) / 1.25)), zB + 0.2, yF)
    for (let i = 0; i < Math.max(1, Math.floor((R - 1.0) / 1.9)); i++) {
      const x = xs + 1.0 + i * 1.9
      box(g, 0.9, 0.9, 0.9, C.wood, x, yF + 0.45, 0.4); box(g, 0.4, 0.3, 0.3, '#e0b04a', x, yF + 1.05, 0.4)
    }
    const rail = box(g, R - 0.4, 0.04, 0.06, '#fff7e0', (xs + xe) / 2, H - 0.2, 0)
    rail.material = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffe3a1', emissiveIntensity: 1.4 })
  } else if (role === 'stock') {
    const n = Math.max(1, Math.floor((R - 1.8) / 1.3))
    for (let i = 0; i < n; i++) {
      const x = xs + 0.7 + i * 1.3
      for (const y of [0.05, 0.6, 1.15, 1.7]) box(g, 1.2, 0.04, 0.5, C.rack, x, yF + y, zB + 0.3)
      for (const dx of [-0.58, 0.58]) box(g, 0.04, 1.8, 0.5, '#e0b04a', x + dx, yF + 0.9, zB + 0.3)
      for (const y of [0.1, 0.65, 1.2]) for (let k = 0; k < 2; k++) box(g, 0.45, 0.4, 0.4, '#c9a46a', x - 0.3 + k * 0.55, yF + y + 0.22, zB + 0.3)
    }
    desk(g, xe - 1.0, zA - 0.45, yF)
  } else if (role === 'kitchen') {
    stainless(g, xs + R / 2, zB + 0.35, Math.min(R - 0.6, 4.0), 0.7, yF)
    hood(g, xs + R / 2, zB + 0.4, yF, Hin)
    stainless(g, xs + R / 2, 0.15, 2.0, 0.9, yF)
    stainless(g, xs + 1.0, zA - 0.35, 1.4, 0.7, yF)
    box(g, 0.7, 1.9, 0.7, '#cfd3d6', xe - 0.4, yF + 0.95, zA - 0.4)
  }
  g.traverse((m) => { if (m.isMesh && m.material !== GLASS) m.castShadow = true })
  return g
}

// ── Viewer ───────────────────────────────────────────────────
export function createViewer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55

  const sun = new THREE.DirectionalLight('#fff3e0', 2.4)
  sun.position.set(-9, 14, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 55 })
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03
  scene.add(sun)
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#b9a98a', 0.5))
  const lamps = [new THREE.PointLight('#ffd9a0', 0, 7, 1.6), new THREE.PointLight('#ffd9a0', 0, 7, 1.6)]
  lamps.forEach((l) => scene.add(l))

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ opacity: 0.22 }))
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), new THREE.MeshBasicMaterial({ map: tex('ground'), transparent: true, depthWrite: false }))
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; scene.add(disc)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.07
  controls.enablePan = false
  controls.minDistance = 4; controls.maxDistance = 55
  controls.maxPolarAngle = Math.PI / 2 - 0.03
  controls.autoRotateSpeed = 1.2

  const world = new THREE.Group(); scene.add(world)
  const roots = [] // { root, cont, target:{x,z,rot}, unit }
  const parts = {}
  const leaving = []
  const entering = []
  let cut = false
  let wantDist = 14
  let targetY = 1.6
  let userMoved = false, raf, first = true, lastKey = null
  let curUnits = []

  const disposeObj = (o) => { o.parent && o.parent.remove(o); o.traverse((c) => { if (c.geometry) c.geometry.dispose() }) }
  function removePart(key) {
    const p = parts[key]; if (!p) return
    delete parts[key]
    leaving.push({ obj: p.obj, t0: performance.now() })
  }
  function ensure(key, sig, parent, build) {
    const p = parts[key]
    if (p && p.sig === sig) return
    const isNew = !p
    if (p) { delete parts[key]; disposeObj(p.obj) }
    if (!build) return
    const obj = build()
    parent.add(obj)
    parts[key] = { sig, obj }
    if (isNew && !key.endsWith(':shell')) { obj.scale.setScalar(0.001); entering.push({ obj, t0: performance.now() }) }
  }
  const setPart = (key, sig, parent, build) => { if (sig == null) removePart(key); else ensure(key, sig, parent, build) }

  function applyCut() {
    curUnits.forEach((u, i) => {
      const sh = parts[i + ':shell']?.obj
      if (sh) {
        const a = sh.getObjectByName('sideA'), b = sh.getObjectByName('sideB'), r = sh.getObjectByName('roof')
        if (a) a.visible = !(cut && u.cutSide === 'A')
        if (b) b.visible = !(cut && u.cutSide === 'B')
        if (r) r.visible = !cut
      }
      if (parts[i + ':roofdeco']) parts[i + ':roofdeco'].obj.visible = !cut
      if (parts[i + ':facade']) parts[i + ':facade'].obj.visible = !(cut && u.cutSide)
    })
  }

  function update(state) {
    const d = dims(state)
    const U = d.units
    const lay = layoutOpenings(state)
    const X = state.x || {}
    curUnits = U
    // synchronisation des racines
    while (roots.length > U.length) {
      const r = roots.pop()
      const i = roots.length
      Object.keys(parts).filter((k) => k.startsWith(i + ':')).forEach((k) => delete parts[k])
      leaving.push({ obj: r.root, t0: performance.now() })
    }
    U.forEach((u, i) => {
      if (!roots[i]) {
        const root = new THREE.Group(); const cont = new THREE.Group(); cont.position.y = LIFT; root.add(cont); world.add(root)
        root.position.set(u.x, 0, u.z); root.rotation.y = u.rot
        roots[i] = { root, cont, target: null }
        if (!first) { root.scale.setScalar(0.001); entering.push({ obj: root, t0: performance.now() }) }
      }
      roots[i].target = { x: u.x, z: u.z, rot: u.rot }
      roots[i].root.rotation.y = u.rot
    })
    U.forEach((u, i) => {
      const { cont, root } = roots[i]
      const lined = state.insulation !== 'none' || state.usage !== 'raw'
      const shellSig = JSON.stringify([u.sizeId, u.L, u.H, state.cladding, state.cladding === 'wood' || state.cladding === 'corten' ? '' : state.color, u.front, !!u.frontDoor, u.openA, u.openB, state.floor, lined, lay.units[i], !!X.shutters])
      ensure(i + ':shell', shellSig, cont, () => buildShell(u, state, lay.units[i], lined))
      ensure(i + ':plots', u.L, root, () => buildPlots(u))
      const hasDeck = state.deck && i === U.terrace
      setPart(i + ':deck', hasDeck ? [u.L, !!X.pergola].join() : null, cont, () => buildDeck(u, !!X.pergola))
      setPart(i + ':roofdeco', (state.roof !== 'steel' || (i === 0 && (X.stove || X.vmc || X.kitchenpro))) ? [state.roof, u.L, state.color, i === 0 && !!X.stove, i === 0 && !!X.vmc, i === 0 && !!X.kitchenpro].join() : null, cont, () => buildRoofDeco(u, state, i === 0))
      setPart(i + ':hvac', state.hvac && i === 0 ? u.L : null, cont, () => buildHvac(u))
      const facSig = X.sign || X.awning || X.ramp ? [X.sign, X.awning, X.ramp, u.L, U.terrace].join() : null
      setPart(i + ':facade', i === U.terrace ? facSig : null, cont, () => buildFacade(u, state, lay.units[i]))
      const bu = d.n > 1 && (U[1].role === 'wet' || U[1].role === 'bedroom') ? 1 : 0
      const bathHere = state.bath !== 'none' && bu === i
      const intKey = [state.usage, u.role, bathHere && state.bath, u.L, d.n === 1, JSON.stringify(X)].join()
      const showInt = !(state.usage === 'raw' && !bathHere)
      setPart(i + ':interior', showInt ? intKey : null, cont, () => buildInterior(u, { state, role: u.role === 'raw' ? 'raw' : u.role, X, bath: bathHere ? state.bath : 'none', single: d.n === 1 }))
      lamps[i % 2].intensity = state.usage === 'raw' ? 0 : 6
      const wp = new THREE.Vector3(0, LIFT + u.H - 0.4, 0)
      lamps[i % 2].position.set(u.x, wp.y, u.z)
    })
    for (let i = U.length; i < 2; i++) lamps[i].intensity = 0
    applyCut()
    const key = state.size + state.layout
    if (lastKey !== key) { userMoved = false; lastKey = key }
    wantDist = Math.max(d.extent.x, d.extent.z * 1.15) * 1.2 + 7.5
    targetY = U[0].H * 0.5 + 0.3
    if (first) { first = false; camera.position.set(wantDist * 0.78, wantDist * 0.42, wantDist * 0.95); controls.target.set(0, targetY, 0) }
  }

  const ease = (t) => 1 - Math.pow(1 - t, 3)
  function tick(now) {
    for (let i = entering.length - 1; i >= 0; i--) {
      const e = entering[i], t = Math.min(1, (now - e.t0) / 520)
      e.obj.scale.setScalar(0.001 + ease(t) * 0.999 + Math.sin(t * Math.PI) * 0.06)
      if (t >= 1) { e.obj.scale.setScalar(1); entering.splice(i, 1) }
    }
    for (let i = leaving.length - 1; i >= 0; i--) {
      const e = leaving[i], t = Math.min(1, (now - e.t0) / 260)
      e.obj.scale.setScalar(Math.max(0.001, 1 - ease(t)))
      if (t >= 1) { disposeObj(e.obj); leaving.splice(i, 1) }
    }
    roots.forEach((r) => {
      if (!r.target) return
      r.root.position.x += (r.target.x - r.root.position.x) * 0.15
      r.root.position.z += (r.target.z - r.root.position.z) * 0.15
    })
    const off = camera.position.clone().sub(controls.target)
    const dist = off.length()
    off.setLength(dist + (wantDist - dist) * (userMoved ? 0 : 0.06))
    controls.target.y += (targetY - controls.target.y) * 0.08
    camera.position.copy(controls.target).add(off)
    controls.update()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  controls.addEventListener('start', () => (userMoved = true))

  function resize() {
    const w = host.clientWidth, h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = w / h < 0.9 ? 46 : 32
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(host)
  resize()
  raf = requestAnimationFrame(tick)

  return {
    update,
    setCut(v) { cut = v; applyCut() },
    setAutoRotate(v) { controls.autoRotate = v },
    resetView() { userMoved = false; const d = wantDist; camera.position.set(d * 0.78, d * 0.42, d * 0.95); controls.target.set(0, targetY, 0) },
    snapshot() {
      renderer.render(scene, camera)
      const c = document.createElement('canvas'); c.width = renderer.domElement.width; c.height = renderer.domElement.height
      const g = c.getContext('2d')
      const grad = g.createLinearGradient(0, 0, 0, c.height); grad.addColorStop(0, '#f5f1ea'); grad.addColorStop(1, '#e4dfd4')
      g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height)
      g.drawImage(renderer.domElement, 0, 0)
      return c.toDataURL('image/jpeg', 0.88)
    },
  }
}
