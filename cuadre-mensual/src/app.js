'use strict';

// ================= Configuración =================
const PLANILLA_PCT = 0.125;
const STORAGE_KEY = 'cuadre-mensual-v1';
const COLORS = ['#ff2fd6', '#22e6ff', '#b6ff3b', '#ffe14d', '#9b6bff', '#ff6b6b', '#3bffb0', '#ff8c42', '#4dabff', '#f9ff5c'];
const EMOJIS = ['💜', '🏦', '🛵', '👩‍👧', '💡', '🔌', '🐷', '🏠', '🚗', '⛽', '🍔', '🛒', '📱', '🎮', '🎬', '🐶',
  '💊', '🎓', '✈️', '🎁', '💳', '🧾', '🍺', '☕', '👕', '💇', '🏋️', '📦', '🔧', '🌐', '🎵', '❤️'];
const DEFAULT_ITEMS = [
  { nombre: 'NU', icon: '💜' },
  { nombre: 'Bancolombia', icon: '🏦' },
  { nombre: 'Rappi', icon: '🛵' },
  { nombre: 'Mamá', icon: '👩‍👧' },
  { nombre: 'Servicios Floralia', icon: '💡' },
  { nombre: 'Servicios Limonar', icon: '🔌' },
  { nombre: 'Ahorro', icon: '🐷', esAhorro: true },
];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ================= Utilidades =================
const $ = (id) => document.getElementById(id);
const fmt = (n) => '$ ' + Math.round(n).toLocaleString('es-CO');
const parseMoney = (s) => {
  const neg = /^\s*-/.test(s);
  const n = parseInt(String(s).replace(/\D/g, ''), 10) || 0;
  return neg ? -n : n;
};
const uid = () => Math.random().toString(36).slice(2, 10);
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
const parseKey = (k) => { const [y, m] = k.split('-').map(Number); return { y, m: m - 1 }; };
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

// ================= Estado =================
function freshMonth(template) {
  const items = (template || DEFAULT_ITEMS).map((it) => ({
    id: uid(), nombre: it.nombre, icon: it.icon, valor: 0, esAhorro: !!it.esAhorro,
  }));
  return { ingreso: 0, items, cerrado: false };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* almacenamiento no disponible: arrancamos limpio */ }
  const now = new Date();
  return { ahorroBase: 0, meses: {}, actual: monthKey(now.getFullYear(), now.getMonth()) };
}

const state = load();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignorar */ }
}

function month() {
  if (!state.meses[state.actual]) {
    // Copia la estructura (nombres/íconos) del último mes registrado, pero con valores en cero.
    const keys = Object.keys(state.meses).sort();
    const prev = keys.filter((k) => k < state.actual).pop() || keys[0];
    state.meses[state.actual] = freshMonth(prev ? state.meses[prev].items : null);
    save();
  }
  return state.meses[state.actual];
}

const ahorroDe = (m) => m.items.filter((i) => i.esAhorro).reduce((s, i) => s + i.valor, 0);
// Ahorro de meses que aún no se han cerrado (todavía no consolidado en la base).
const ahorroPendiente = () => Object.values(state.meses).filter((m) => !m.cerrado).reduce((s, m) => s + ahorroDe(m), 0);

function calc() {
  const m = month();
  const { y, m: mi } = parseKey(state.actual);
  const planilla = Math.round(m.ingreso * PLANILLA_PCT);
  const otros = m.items.reduce((s, i) => s + i.valor, 0);
  const gastos = planilla + otros;
  const restante = m.ingreso - gastos;
  const dias = daysIn(y, mi);
  const now = new Date();
  const esActual = now.getFullYear() === y && now.getMonth() === mi;
  const diasRestantes = esActual ? dias - now.getDate() + 1 : null;
  return { m, y, mi, planilla, gastos, restante, dias, diasRestantes };
}

// ================= Inputs de dinero con separador de miles =================
function bindMoney(input, onValue) {
  input.addEventListener('input', () => {
    const caret = input.selectionStart;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
    const n = parseMoney(input.value);
    input.value = n ? fmt(n) : '';
    // Recoloca el cursor tras el mismo número de dígitos.
    let pos = 0, seen = 0;
    while (pos < input.value.length && seen < digitsBefore) { if (/\d/.test(input.value[pos])) seen++; pos++; }
    if (digitsBefore === 0) pos = input.value.length ? 2 : 0;
    input.setSelectionRange(pos, pos);
    onValue(n);
  });
  input.addEventListener('focus', () => setTimeout(() => input.select(), 0));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}

// ================= Animación de números =================
const tweens = new WeakMap();
function animateNum(el, to) {
  const from = tweens.get(el)?.value ?? 0;
  const start = performance.now();
  const dur = 550;
  const t = { value: from, raf: 0 };
  cancelAnimationFrame(tweens.get(el)?.raf);
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    t.value = from + (to - from) * e;
    el.textContent = fmt(t.value);
    if (p < 1) t.raf = requestAnimationFrame(step); else t.value = to;
  };
  tweens.set(el, t);
  t.raf = requestAnimationFrame(step);
}

// ================= Render =================
function renderHeader() {
  const { y, mi, dias } = calc();
  $('monthName').textContent = `${MONTHS[mi]} ${y}`;
  $('monthDays').textContent = `${dias} días`;
}

function renderList() {
  const { m, planilla } = calc();
  const list = $('list');
  list.innerHTML = '';

  const pl = document.createElement('div');
  pl.className = 'row planilla';
  pl.innerHTML = `
    <div class="dot" style="color:${'#ffb21f'}"></div>
    <div class="emoji" style="cursor:default">🧾</div>
    <div class="static-name">Planilla <span class="badge">12,5 %</span></div>
    <input class="val" id="planillaVal" readonly tabindex="-1" value="${fmt(planilla)}">
    <div></div>`;
  list.appendChild(pl);

  m.items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'row' + (it.esAhorro ? ' ahorro' : '');
    row.style.animationDelay = `${idx * 35}ms`;
    row.innerHTML = `
      <div class="dot" style="color:${COLORS[idx % COLORS.length]}"></div>
      <div class="emoji" title="Cambiar ícono">${it.icon}</div>
      <input class="name" value="" placeholder="Nombre del gasto">
      <input class="val" inputmode="numeric" placeholder="$ 0" value="${it.valor ? fmt(it.valor) : ''}">
      <button class="del" title="Eliminar">✕</button>`;
    const [nameIn, valIn] = row.querySelectorAll('input');
    nameIn.value = it.nombre;
    nameIn.addEventListener('input', () => { it.nombre = nameIn.value; save(); renderSummary(); });
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') valIn.focus(); });
    bindMoney(valIn, (n) => { it.valor = n; save(); renderSummary(); });
    row.querySelector('.emoji').addEventListener('click', (e) => openPicker(e.currentTarget, it));
    row.querySelector('.del').addEventListener('click', () => {
      row.classList.add('removing');
      setTimeout(() => {
        m.items = m.items.filter((x) => x !== it);
        save(); renderList(); renderSummary();
      }, 280);
    });
    list.appendChild(row);
  });
}

function renderSummary() {
  const c = calc();
  animateNum($('kIncome'), c.m.ingreso);
  animateNum($('kExpenses'), c.gastos);
  animateNum($('kRemaining'), c.restante);
  $('planillaVal') && ($('planillaVal').value = fmt(c.planilla));

  const box = $('restanteBox');
  const wasNeg = box.classList.contains('neg');
  box.classList.toggle('neg', c.restante < 0);
  if (c.restante < 0 && !wasNeg) { box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; }

  let mood;
  if (!c.m.ingreso) mood = 'Ingresa lo que te pagaron 👆';
  else if (c.restante < 0) mood = 'Uy… te pasaste. Toca apretar 😬';
  else if (c.restante < c.m.ingreso * 0.1) mood = 'Justo pero se puede 😅';
  else if (c.restante < c.m.ingreso * 0.3) mood = 'Vas bien, con cabeza 😎';
  else mood = '¡Mes holgado! A disfrutar con juicio 🤩';
  $('mood').textContent = mood;

  // Por día según el mes
  animateNum($('kPerDay'), c.restante / c.dias);
  $('perDayLabel').textContent = `${c.restante >= 0 ? fmt(c.restante) : '-' + fmt(-c.restante)} ÷ ${c.dias} días`;
  $('chips').innerHTML = [28, 29, 30, 31].map((d) =>
    `<div class="chip ${d === c.dias ? 'active' : ''}"><b>${d} días</b><span>${fmt(c.restante / d)}</span></div>`).join('');

  const tb = $('todayBox');
  if (c.diasRestantes) {
    tb.style.display = '';
    $('todayLabel').textContent = `Quedan ${c.diasRestantes} día${c.diasRestantes === 1 ? '' : 's'} (incluye hoy)`;
    animateNum($('kToday'), c.restante / c.diasRestantes);
  } else tb.style.display = 'none';

  // Ahorro total
  const total = state.ahorroBase + ahorroPendiente();
  const sIn = $('savingsTotal');
  if (document.activeElement !== sIn) sIn.value = fmt(total);
  const am = ahorroDe(c.m);
  $('savingsHint').textContent = c.m.cerrado
    ? `mes cerrado · ${fmt(am)} consolidado`
    : am ? `+ ${fmt(am)} de este mes` : 'incluye este mes';

  const cm = $('closeMonth');
  cm.textContent = c.m.cerrado ? '↩️ Reabrir mes' : '✅ Cerrar mes';

  renderChart(c);
}

function renderChart(c) {
  const parts = [{ nombre: 'Planilla', valor: c.planilla, color: '#ffb21f' }]
    .concat(c.m.items.map((it, i) => ({ nombre: it.nombre || 'Sin nombre', valor: it.valor, color: COLORS[i % COLORS.length] })));
  if (c.restante > 0) parts.push({ nombre: 'Restante', valor: c.restante, color: 'rgba(255,255,255,.18)' });
  const total = parts.reduce((s, p) => s + Math.max(0, p.valor), 0);
  const R = 15.915; // circunferencia = 100
  let offset = 0;
  let svg = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6"></circle>`;
  if (total > 0) {
    parts.forEach((p) => {
      const pct = (Math.max(0, p.valor) / total) * 100;
      if (pct <= 0) return;
      svg += `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${p.color}" stroke-width="6"
        stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}"
        style="filter:drop-shadow(0 0 2px ${p.color})"></circle>`;
      offset += pct;
    });
  }
  $('donut').innerHTML = svg;
  $('legend').innerHTML = parts.filter((p) => p.valor > 0).map((p) =>
    `<div><i style="background:${p.color}"></i><span>${escapeHtml(p.nombre)}</span><span>${total ? Math.round((p.valor / total) * 100) : 0}%</span></div>`
  ).join('') || '<div style="color:var(--muted)">Aún no hay datos 🌱</div>';
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function renderAll() {
  const m = month();
  const inc = $('income');
  inc.value = m.ingreso ? fmt(m.ingreso) : '';
  renderHeader();
  renderList();
  renderSummary();
}

// ================= Selector de íconos =================
let pickerTarget = null;
function openPicker(anchor, item) {
  const p = $('picker');
  pickerTarget = item;
  p.innerHTML = EMOJIS.map((e) => `<button>${e}</button>`).join('');
  p.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    pickerTarget.icon = b.textContent; save(); p.classList.remove('open'); renderList();
  }));
  const r = anchor.getBoundingClientRect();
  p.classList.add('open');
  const top = Math.min(r.bottom + 6, window.innerHeight - p.offsetHeight - 10);
  p.style.left = `${Math.max(10, r.left)}px`;
  p.style.top = `${top}px`;
}
document.addEventListener('mousedown', (e) => {
  const p = $('picker');
  if (p.classList.contains('open') && !p.contains(e.target) && !e.target.classList.contains('emoji')) p.classList.remove('open');
});

// ================= Eventos =================
bindMoney($('income'), (n) => { month().ingreso = n; save(); renderSummary(); });

bindMoney($('savingsTotal'), (n) => { state.ahorroBase = n - ahorroPendiente(); save(); renderSummary(); });
$('savingsTotal').addEventListener('blur', renderSummary);

$('addRow').addEventListener('click', () => {
  const m = month();
  m.items.push({ id: uid(), nombre: '', icon: EMOJIS[(m.items.length + 7) % EMOJIS.length], valor: 0, esAhorro: false });
  save(); renderList(); renderSummary();
  const names = $('list').querySelectorAll('input.name');
  const last = names[names.length - 1];
  last.focus();
  last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function shiftMonth(delta) {
  const { y, m } = parseKey(state.actual);
  const d = new Date(y, m + delta, 1);
  state.actual = monthKey(d.getFullYear(), d.getMonth());
  save(); renderAll();
}
$('prevMonth').addEventListener('click', () => shiftMonth(-1));
$('nextMonth').addEventListener('click', () => shiftMonth(1));

$('closeMonth').addEventListener('click', () => {
  const m = month();
  const am = ahorroDe(m);
  // Al cerrar, el ahorro del mes queda consolidado en la base; al reabrir, vuelve a quedar pendiente.
  if (!m.cerrado) {
    state.ahorroBase += am; m.cerrado = true;
    toast(`Mes cerrado 🎉 ${am ? fmt(am) + ' sumados al ahorro' : ''}`);
    confetti();
  } else {
    state.ahorroBase -= am; m.cerrado = false;
    toast('Mes reabierto ✏️');
  }
  save(); renderSummary();
});

$('copy').addEventListener('click', async () => {
  const c = calc();
  const lines = [
    `CUADRE ${MONTHS[c.mi].toUpperCase()} ${c.y}`,
    `Ingreso: ${fmt(c.m.ingreso)}`,
    `Planilla (12,5%): ${fmt(c.planilla)}`,
    ...c.m.items.filter((i) => i.valor).map((i) => `${i.nombre || 'Sin nombre'}: ${fmt(i.valor)}`),
    `Total gastos: ${fmt(c.gastos)}`,
    `Restante: ${fmt(c.restante)}`,
    `Por día (${c.dias} días): ${fmt(c.restante / c.dias)}`,
  ];
  try { await navigator.clipboard.writeText(lines.join('\n')); toast('Resumen copiado 📋'); }
  catch (e) { toast('No se pudo copiar 😕'); }
});

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ================= Fondo: estrellas y monedas flotantes =================
(function stars() {
  const cv = $('stars');
  const ctx = cv.getContext('2d');
  let W, H, pts = [];
  const coins = ['$', '💰', '✨', '🪙'];
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    pts = Array.from({ length: 140 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3,
      s: Math.random() * .3 + .05, tw: Math.random() * Math.PI * 2,
    }));
  }
  const floaters = Array.from({ length: 10 }, () => newFloater(true));
  function newFloater(init) {
    return {
      x: Math.random() * innerWidth, y: init ? Math.random() * innerHeight : innerHeight + 40,
      v: Math.random() * .4 + .2, ch: coins[Math.floor(Math.random() * coins.length)],
      size: Math.random() * 14 + 12, a: Math.random() * .25 + .1, sway: Math.random() * Math.PI * 2,
    };
  }
  let mx = 0, my = 0;
  addEventListener('mousemove', (e) => { mx = (e.clientX / W - .5); my = (e.clientY / H - .5); });
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.y += p.s; if (p.y > H) { p.y = 0; p.x = Math.random() * W; }
      const a = .4 + Math.sin(t / 600 + p.tw) * .4;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(p.x + mx * p.r * 12, p.y + my * p.r * 12, p.r, 0, 7); ctx.fill();
    }
    floaters.forEach((f, i) => {
      f.y -= f.v; f.sway += .02;
      if (f.y < -40) floaters[i] = newFloater(false);
      ctx.globalAlpha = f.a;
      ctx.font = `${f.size}px "Segoe UI Emoji", sans-serif`;
      ctx.fillStyle = '#b6ff3b';
      ctx.fillText(f.ch, f.x + Math.sin(f.sway) * 20, f.y);
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();

// ================= Confeti =================
function confetti() {
  const cv = $('confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const ps = Array.from({ length: 180 }, () => ({
    x: innerWidth / 2, y: innerHeight / 2,
    vx: (Math.random() - .5) * 18, vy: Math.random() * -18 - 4,
    c: COLORS[Math.floor(Math.random() * COLORS.length)], s: Math.random() * 8 + 4,
    r: Math.random() * 6, vr: (Math.random() - .5) * .4,
  }));
  const end = performance.now() + 2600;
  (function tick(now) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (now < end) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
  })(performance.now());
}

renderAll();
