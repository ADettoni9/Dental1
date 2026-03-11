/* ========================================================
   DENTAL LAB — App Logic (Vanilla JS + Supabase)
   Simplified UX version
   ======================================================== */

// ─── SUPABASE CONFIG ────────────────────────────────────
const SUPABASE_URL = 'https://vitubfpgpssjyvzlwkfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdHViZnBncHNzanl2emx3a2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDU3ODAsImV4cCI6MjA4ODcyMTc4MH0.sQN37a8cUa7aMu03PX_jMrTaEsangYUonZ-V_NnWDng';

let db = null;
try {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.warn('Supabase init error:', e);
}

function isSupabaseReady() {
  if (!db) {
    showToast('Error: No se pudo conectar con la base de datos', 'error');
    return false;
  }
  return true;
}

// ─── DOM REFERENCES ─────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
const tabs = $$('.tab');
const sections = $$('.section');

// Modal
const modalOverlay = $('#modal-overlay');
const modalTitle = $('#modal-title');
const modalBody = $('#modal-body');
const modalClose = $('#modal-close');

// Detail modal
const detailOverlay = $('#detail-overlay');
const detailTitle = $('#detail-title');
const detailBody = $('#detail-body');
const detailClose = $('#detail-close');

// Ficha form
const formMov = $('#form-movimiento');
const movFecha = $('#mov-fecha');
const movDoctor = $('#mov-doctor');
const movTrabajo = $('#mov-trabajo');
const movConceptoPago = $('#mov-concepto-pago');
const movDebe = $('#mov-debe');
const movHaber = $('#mov-haber');
const groupTrabajo = $('#group-trabajo');
const groupConceptoPago = $('#group-concepto-pago');
const groupDebe = $('#group-debe');
const groupHaber = $('#group-haber');

// ─── UTILITIES ──────────────────────────────────────────
function formatMoney(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────
function showToast(message, type = 'success') {
  const container = $('#toast-container');
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f39c12" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `${icons[type] || icons.success}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ─── TAB NAVIGATION ─────────────────────────────────────
function switchSection(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.section === name));
  sections.forEach(s => s.classList.toggle('active', s.id === `section-${name}`));

  // Load data for the section
  if (name === 'dashboard') loadDashboard();
  if (name === 'precios')   loadPrecios();
  if (name === 'ficha')     loadFicha();
  if (name === 'doctores')  loadDoctores();
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchSection(tab.dataset.section));
});

// ─── MODAL HELPERS ──────────────────────────────────────
function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalOverlay.classList.add('open');
}

function closeModal() { modalOverlay.classList.remove('open'); }

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

function openDetailModal(title, html) {
  detailTitle.textContent = title;
  detailBody.innerHTML = html;
  detailOverlay.classList.add('open');
}

function closeDetailModal() { detailOverlay.classList.remove('open'); }

detailClose.addEventListener('click', closeDetailModal);
detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetailModal(); });

// ========================================================
// MODULE: PRECIOS (CRUD)
// ========================================================
let allPrecios = [];

async function loadPrecios() {
  if (!isSupabaseReady()) return;
  const { data, error } = await db
    .from('precios').select('*')
    .order('categoria').order('nombre_trabajo');

  if (error) { showToast('Error al cargar precios: ' + error.message, 'error'); return; }
  allPrecios = data || [];
  renderPrecios();
}

function renderPrecios() {
  const tbody = $('#tbody-precios');
  if (!allPrecios.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay precios cargados todavía</td></tr>';
    return;
  }
  tbody.innerHTML = allPrecios.map(p => `
    <tr>
      <td><strong style="color:var(--primary-500)">${esc(p.categoria)}</strong></td>
      <td>${esc(p.nombre_trabajo)}</td>
      <td class="text-right" style="font-weight:700;font-size:1.05rem">${formatMoney(p.precio_actual)}</td>
      <td class="text-center">
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="editPrecio(${p.id})">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deletePrecio(${p.id})">🗑️ Borrar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

$('#btn-add-precio').addEventListener('click', () => {
  openModal('➕ Agregar Precio', `
    <div class="form-group">
      <label for="inp-cat">Categoría</label>
      <input type="text" id="inp-cat" placeholder="Ej: Prótesis Removible" />
    </div>
    <div class="form-group">
      <label for="inp-trabajo">Nombre del trabajo</label>
      <input type="text" id="inp-trabajo" placeholder="Ej: Corona colada entera" />
    </div>
    <div class="form-group">
      <label for="inp-precio">Precio ($)</label>
      <input type="number" id="inp-precio" min="0" step="0.01" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">❌ Cancelar</button>
      <button class="btn btn-primary" onclick="savePrecio()">✅ Guardar</button>
    </div>
  `);
});

window.savePrecio = async function () {
  const cat = $('#inp-cat').value.trim();
  const trabajo = $('#inp-trabajo').value.trim();
  const precio = parseFloat($('#inp-precio').value) || 0;
  if (!cat || !trabajo) { showToast('Completá la categoría y el nombre del trabajo', 'warning'); return; }

  const { error } = await db.from('precios').insert({ categoria: cat, nombre_trabajo: trabajo, precio_actual: precio });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ Precio guardado correctamente');
  closeModal();
  loadPrecios();
};

window.editPrecio = function (id) {
  const p = allPrecios.find(x => x.id === id);
  if (!p) return;
  openModal('✏️ Editar Precio', `
    <div class="form-group">
      <label for="inp-cat">Categoría</label>
      <input type="text" id="inp-cat" value="${esc(p.categoria)}" />
    </div>
    <div class="form-group">
      <label for="inp-trabajo">Nombre del trabajo</label>
      <input type="text" id="inp-trabajo" value="${esc(p.nombre_trabajo)}" />
    </div>
    <div class="form-group">
      <label for="inp-precio">Precio ($)</label>
      <input type="number" id="inp-precio" min="0" step="0.01" value="${p.precio_actual}" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">❌ Cancelar</button>
      <button class="btn btn-primary" onclick="updatePrecio(${id})">✅ Guardar cambios</button>
    </div>
  `);
};

window.updatePrecio = async function (id) {
  const cat = $('#inp-cat').value.trim();
  const trabajo = $('#inp-trabajo').value.trim();
  const precio = parseFloat($('#inp-precio').value) || 0;
  if (!cat || !trabajo) { showToast('Completá la categoría y el nombre', 'warning'); return; }

  const { error } = await db.from('precios').update({ categoria: cat, nombre_trabajo: trabajo, precio_actual: precio }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ Precio actualizado');
  closeModal();
  loadPrecios();
};

window.deletePrecio = async function (id) {
  if (!confirm('¿Estás seguro que querés borrar este precio?')) return;
  const { error } = await db.from('precios').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Precio eliminado');
  loadPrecios();
};

// ========================================================
// MODULE: FICHA DE CARGA (Movimientos)
// ========================================================
let allDoctores = [];

function getMovTipo() {
  const checked = document.querySelector('input[name="mov-tipo"]:checked');
  return checked ? checked.value : 'trabajo';
}

async function loadFicha() {
  movFecha.value = todayISO();
  if (!isSupabaseReady()) return;

  // Load doctors dropdown
  const { data: docs } = await db.from('doctores').select('*').order('nombre_completo');
  allDoctores = docs || [];
  movDoctor.innerHTML = '<option value="">— Elegí un doctor —</option>' +
    allDoctores.map(d => `<option value="${d.id}">${esc(d.nombre_completo)}</option>`).join('');

  // Load precios dropdown
  const { data: precios } = await db.from('precios').select('*').order('categoria').order('nombre_trabajo');
  allPrecios = precios || [];
  movTrabajo.innerHTML = '<option value="">— Elegí el trabajo —</option>' +
    allPrecios.map(p => `<option value="${p.id}" data-precio="${p.precio_actual}">${esc(p.categoria)} — ${esc(p.nombre_trabajo)} (${formatMoney(p.precio_actual)})</option>`).join('');

  loadMovimientosRecientes();
}

// Radio toggle: Trabajo vs Pago
$$('input[name="mov-tipo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isPago = getMovTipo() === 'pago';

    // Toggle visual selection
    $('#radio-trabajo').classList.toggle('selected', !isPago);
    $('#radio-pago').classList.toggle('selected', isPago);

    // Show/hide relevant fields
    groupTrabajo.classList.toggle('hidden', isPago);
    groupConceptoPago.classList.toggle('hidden', !isPago);
    groupDebe.classList.toggle('hidden', isPago);
    groupHaber.classList.toggle('hidden', !isPago);

    if (isPago) {
      movDebe.value = 0;
      movHaber.value = '';
      movTrabajo.value = '';
    } else {
      movHaber.value = 0;
      movConceptoPago.value = '';
    }
  });
});

// Autocomplete price when selecting a trabajo
movTrabajo.addEventListener('change', () => {
  const opt = movTrabajo.options[movTrabajo.selectedIndex];
  const precio = opt ? opt.dataset.precio : 0;
  movDebe.value = precio || 0;
  movHaber.value = 0;
});

// Save movimiento
formMov.addEventListener('submit', async (e) => {
  e.preventDefault();
  const doctorId = parseInt(movDoctor.value);
  if (!doctorId) { showToast('⚠️ Elegí un doctor primero', 'warning'); return; }

  const tipo = getMovTipo();
  let concepto = '';

  if (tipo === 'trabajo') {
    if (!movTrabajo.value) { showToast('⚠️ Elegí qué trabajo hiciste', 'warning'); return; }
    const p = allPrecios.find(x => x.id === parseInt(movTrabajo.value));
    concepto = p ? p.nombre_trabajo : 'Trabajo';
  } else {
    concepto = movConceptoPago.value.trim() || 'Pago';
  }

  const debe = parseFloat(movDebe.value) || 0;
  const haber = parseFloat(movHaber.value) || 0;

  const { error } = await db.from('movimientos').insert({
    fecha: movFecha.value,
    doctor_id: doctorId,
    concepto,
    debe,
    haber
  });

  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ ¡Guardado correctamente!');
  formMov.reset();
  movFecha.value = todayISO();
  // Reset radio visual state
  $('#radio-trabajo').classList.add('selected');
  $('#radio-pago').classList.remove('selected');
  document.querySelector('input[name="mov-tipo"][value="trabajo"]').checked = true;
  groupTrabajo.classList.remove('hidden');
  groupConceptoPago.classList.add('hidden');
  groupDebe.classList.remove('hidden');
  groupHaber.classList.add('hidden');
  loadMovimientosRecientes();
});

async function loadMovimientosRecientes() {
  if (!isSupabaseReady()) return;
  const { data, error } = await db
    .from('movimientos')
    .select('*, doctores(nombre_completo)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { showToast('Error al cargar movimientos', 'error'); return; }
  const tbody = $('#tbody-movimientos');
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Todavía no cargaste ningún movimiento</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${formatDate(m.fecha)}</td>
      <td><strong>${esc(m.doctores?.nombre_completo || '—')}</strong></td>
      <td>${esc(m.concepto)}</td>
      <td class="text-right" style="color:${m.debe > 0 ? 'var(--danger)' : 'inherit'};font-weight:600">${m.debe > 0 ? formatMoney(m.debe) : '—'}</td>
      <td class="text-right" style="color:${m.haber > 0 ? 'var(--success)' : 'inherit'};font-weight:600">${m.haber > 0 ? formatMoney(m.haber) : '—'}</td>
      <td class="text-center">
        <button class="btn btn-danger btn-sm" onclick="deleteMovimiento(${m.id})">🗑️ Borrar</button>
      </td>
    </tr>
  `).join('');
}

window.deleteMovimiento = async function (id) {
  if (!confirm('¿Estás seguro que querés borrar este movimiento?')) return;
  const { error } = await db.from('movimientos').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Movimiento eliminado');
  loadMovimientosRecientes();
};

// ========================================================
// MODULE: DASHBOARD (Resumen de Cuentas)
// ========================================================
async function loadDashboard() {
  if (!isSupabaseReady()) return;
  const { data, error } = await db.from('resumen_cuentas').select('*');
  if (error) { showToast('Error al cargar resumen: ' + error.message, 'error'); return; }

  const resumen = data || [];
  const totalDoctors = resumen.length;
  const totalDebe = resumen.reduce((s, r) => s + Number(r.total_debe), 0);
  const totalHaber = resumen.reduce((s, r) => s + Number(r.total_haber), 0);
  const totalSaldo = totalDebe - totalHaber;

  $('#kpi-doctors').textContent = totalDoctors;
  $('#kpi-debe').textContent = formatMoney(totalDebe);
  $('#kpi-haber').textContent = formatMoney(totalHaber);
  $('#kpi-saldo').textContent = formatMoney(totalSaldo);

  const tbody = $('#tbody-resumen');
  if (!resumen.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay datos todavía</td></tr>';
    return;
  }
  tbody.innerHTML = resumen.map(r => {
    const saldo = Number(r.saldo);
    const badgeClass = saldo > 0 ? 'badge--positive' : 'badge--zero';
    return `
      <tr>
        <td><strong>${esc(r.nombre_completo)}</strong></td>
        <td class="text-right" style="color:var(--danger);font-weight:600">${formatMoney(r.total_debe)}</td>
        <td class="text-right" style="color:var(--success);font-weight:600">${formatMoney(r.total_haber)}</td>
        <td class="text-right"><span class="badge ${badgeClass}">${formatMoney(saldo)}</span></td>
        <td class="text-center">
          <button class="btn btn-edit btn-sm" onclick="showDoctorDetail(${r.doctor_id}, '${esc(r.nombre_completo)}')">
            👁️ Ver detalle
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.showDoctorDetail = async function (doctorId, doctorName) {
  const { data, error } = await db
    .from('movimientos').select('*')
    .eq('doctor_id', doctorId)
    .order('fecha', { ascending: true });

  if (error) { showToast('Error al cargar detalle', 'error'); return; }

  const rows = data || [];
  let sumDebe = 0, sumHaber = 0;
  rows.forEach(r => { sumDebe += Number(r.debe); sumHaber += Number(r.haber); });
  const saldo = sumDebe - sumHaber;

  let html = `
    <div class="detail-summary">
      <div class="detail-summary-item"><span>Total que debe</span><span style="color:var(--danger)">${formatMoney(sumDebe)}</span></div>
      <div class="detail-summary-item"><span>Total que pagó</span><span style="color:var(--success)">${formatMoney(sumHaber)}</span></div>
      <div class="detail-summary-item"><span>Saldo</span><span>${formatMoney(saldo)}</span></div>
    </div>
  `;

  if (rows.length) {
    html += `<div class="table-responsive"><table class="detail-table">
      <thead><tr><th>Fecha</th><th>Concepto</th><th class="text-right">Debe</th><th class="text-right">Pagó</th></tr></thead>
      <tbody>` +
      rows.map(r => `
        <tr>
          <td>${formatDate(r.fecha)}</td>
          <td>${esc(r.concepto)}</td>
          <td class="text-right" style="color:${r.debe > 0 ? 'var(--danger)' : 'inherit'}">${r.debe > 0 ? formatMoney(r.debe) : '—'}</td>
          <td class="text-right" style="color:${r.haber > 0 ? 'var(--success)' : 'inherit'}">${r.haber > 0 ? formatMoney(r.haber) : '—'}</td>
        </tr>
      `).join('') +
      `</tbody></table></div>`;
  } else {
    html += '<p class="empty-state">Este doctor no tiene movimientos todavía</p>';
  }

  openDetailModal(`👨‍⚕️ ${doctorName}`, html);
};

// ========================================================
// MODULE: DOCTORES CRUD
// ========================================================
async function loadDoctores() {
  if (!isSupabaseReady()) return;
  const { data, error } = await db.from('doctores').select('*').order('nombre_completo');
  if (error) { showToast('Error al cargar doctores', 'error'); return; }

  const tbody = $('#tbody-doctores');
  const docs = data || [];
  if (!docs.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No hay doctores cargados todavía</td></tr>';
    return;
  }
  tbody.innerHTML = docs.map((d, i) => `
    <tr>
      <td style="color:var(--gray-500)">${i + 1}</td>
      <td><strong>${esc(d.nombre_completo)}</strong></td>
      <td class="text-center">
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="editDoctor(${d.id}, '${esc(d.nombre_completo)}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDoctor(${d.id})">🗑️ Borrar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

$('#btn-add-doctor').addEventListener('click', () => {
  openModal('➕ Agregar Doctor', `
    <div class="form-group">
      <label for="inp-doctor-name">Nombre completo del doctor</label>
      <input type="text" id="inp-doctor-name" placeholder="Ej: Dr. Marconi" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">❌ Cancelar</button>
      <button class="btn btn-primary" onclick="saveDoctor()">✅ Guardar</button>
    </div>
  `);
});

window.saveDoctor = async function () {
  const name = $('#inp-doctor-name').value.trim();
  if (!name) { showToast('⚠️ Escribí el nombre del doctor', 'warning'); return; }
  const { error } = await db.from('doctores').insert({ nombre_completo: name });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ Doctor agregado');
  closeModal();
  loadDoctores();
};

window.editDoctor = function (id, name) {
  openModal('✏️ Editar Doctor', `
    <div class="form-group">
      <label for="inp-doctor-name">Nombre completo del doctor</label>
      <input type="text" id="inp-doctor-name" value="${name}" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">❌ Cancelar</button>
      <button class="btn btn-primary" onclick="updateDoctor(${id})">✅ Guardar cambios</button>
    </div>
  `);
};

window.updateDoctor = async function (id) {
  const name = $('#inp-doctor-name').value.trim();
  if (!name) { showToast('⚠️ Escribí el nombre del doctor', 'warning'); return; }
  const { error } = await db.from('doctores').update({ nombre_completo: name }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ Doctor actualizado');
  closeModal();
  loadDoctores();
};

window.deleteDoctor = async function (id) {
  if (!confirm('¿Estás seguro que querés borrar este doctor?\n\nSe van a borrar todos sus movimientos también.')) return;
  const { error } = await db.from('doctores').delete().eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Doctor eliminado');
  loadDoctores();
};

// ─── LOGIN ──────────────────────────────────────────────
const VALID_USER = 'Alejandro';
const VALID_PASS = 'Camuglia123';

function initLogin() {
  const loginScreen = $('#login-screen');
  const loginForm = $('#login-form');
  const loginUser = $('#login-user');
  const loginPass = $('#login-pass');
  const loginError = $('#login-error');
  const toggleBtn = $('#toggle-password');
  const eyeOpen = $('#eye-open');
  const eyeClosed = $('#eye-closed');
  const appContainer = $('#app-container');

  // Check if already logged in
  if (sessionStorage.getItem('dental_logged_in') === 'true') {
    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    startApp();
    return;
  }

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const isPassword = loginPass.type === 'password';
    loginPass.type = isPassword ? 'text' : 'password';
    eyeOpen.style.display = isPassword ? 'none' : 'block';
    eyeClosed.style.display = isPassword ? 'block' : 'none';
  });

  // Login form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = loginUser.value.trim();
    const pass = loginPass.value;

    if (user === VALID_USER && pass === VALID_PASS) {
      sessionStorage.setItem('dental_logged_in', 'true');
      loginScreen.classList.add('hidden');
      appContainer.classList.remove('hidden');
      loginError.textContent = '';
      showToast('¡Bienvenido, ' + user + '! 👋');
      startApp();
    } else {
      loginError.textContent = '❌ Usuario o contraseña incorrectos';
      loginPass.value = '';
      loginPass.focus();
    }
  });
}

// Logout
$('#btn-logout').addEventListener('click', () => {
  if (!confirm('¿Querés salir del sistema?')) return;
  sessionStorage.removeItem('dental_logged_in');
  location.reload();
});

function startApp() {
  movFecha.value = todayISO();
  loadDashboard();
}

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
});
