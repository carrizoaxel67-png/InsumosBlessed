// ─── ESTADO ────────────────────────────────────────────────────────────────
let currentCategory = 'perfumes';
let currentView = 'table';
let hasUnsavedChanges = false;
let workingPerfumes = [];
let workingVapes = [];
let workingBarber = [];
let editingId = null;

// ─── INICIALIZACIÓN ─────────────────────────────────────────────────────────
async function init() {
    fetchWeatherAndCurrency(); // Iniciar asíncronamente para evitar que se cuelgue al principio
    await loadProductsFromCloud();
    setupListeners();
    initViews();
    render();
}

async function fetchWeatherAndCurrency() {
    try {
        const resW = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.3375&longitude=-56.7136&current_weather=true');
        const dataW = await resW.json();
        const temp = Math.round(dataW.current_weather.temperature);
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const hoy = dias[new Date().getDay()];
        const el = document.getElementById('weatherTemp');
        if (el) el.innerHTML = `${temp}°C <span class="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 font-bold">${hoy}</span>`;
    } catch(e) {
        console.warn('Weather error', e);
    }

    try {
        const resU = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataU = await resU.json();
        const uyu = dataU.rates.UYU.toFixed(2);
        const elU = document.getElementById('widgetUSD');
        if (elU) elU.innerText = `$${uyu}`;
    } catch(e) {
        console.warn('Currency error', e);
    }
}

async function loadProductsFromCloud() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/get-products', { cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.perfumes && data.vapes) {
                workingPerfumes = data.perfumes;
                workingVapes = data.vapes;
                workingBarber = data.barber || defaultBarber();
                return;
            }
        }
    } catch (e) {
        console.warn('Usando datos locales por falla o timeout en la nube.', e);
    }
    // Fallback a datos locales
    workingPerfumes = inventory.map(p => ({
        ...p, price: p.price || p.cost + 500,
        stock: p.stock ?? null, visible: p.visible ?? true
    }));
    workingVapes = vapeModels.map(v => ({
        ...v, price: v.price || v.cost + 500, visible: v.visible ?? true
    }));
    workingBarber = defaultBarber();
}

function defaultBarber() {
    return (typeof barberItems !== 'undefined' ? barberItems : []).map(b => ({
        ...b, visible: b.visible ?? true, stock: b.stock ?? null
    }));
}

// ─── GUARDADO ────────────────────────────────────────────────────────────────
async function saveChanges() {
    const btn = document.getElementById('btnSave');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spin">⟳</span> <span>Guardando</span>';
    btn.disabled = true;

    try {
        const res = await fetch('/api/save-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                perfumes: workingPerfumes,
                vapes: workingVapes,
                barber: workingBarber
            })
        });

        if (res.ok) {
            hasUnsavedChanges = false;
            document.getElementById('unsavedBanner').classList.add('hidden');
            showToast('✓ Cambios guardados', 'success');
        } else {
            const err = await res.json().catch(() => ({}));
            showToast('✗ Error: ' + (err.error || res.status), 'error');
            showToast('Error: ' + (err.error || res.status), 'error');
        }
    } catch (err) {
        console.error('Error guardando:', err);
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}


function markUnsaved() {
    if (!hasUnsavedChanges) {
        hasUnsavedChanges = true;
        document.getElementById('unsavedBanner').classList.remove('hidden');
    }
}

// ── SIDEBAR / SECTIONS ──────────────────────────────────────────────────────
function switchSection(name) {
    const sections = ['Catalogo','Categorias','Calculadora','Reviews','Divisas','Reservas'];
    sections.forEach(s => {
        const el = document.getElementById('section' + s);
        if (el) el.classList.toggle('hidden', s.toLowerCase() !== name);
    });
    const navMap = { catalogo:'navCatalogo', categorias:'navCategorias', calculadora:'navCalculadora', reviews:'navReviews', divisas:'navDivisas', reservas:'navReservas' };
    Object.entries(navMap).forEach(([k,id]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', k === name);
    });
}

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
function setCategory(cat) {
    currentCategory = cat;
    const pf = document.getElementById('perfumeFilters');
    const cats = { perfumes: 'catPerfumes', vapes: 'catVapes', barber: 'catBarber' };

    Object.entries(cats).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (k === cat) {
            el.className = "flex-1 py-3 md:py-2 rounded-lg bg-[#c5a059] text-black font-bold text-sm transition-all shadow-sm";
        } else {
            el.className = "flex-1 py-3 md:py-2 rounded-lg text-zinc-500 hover:text-white font-bold text-sm transition-all";
        }
    });

    if (pf) pf.classList.toggle('hidden', cat !== 'perfumes');
    render();
}

// ─── VISTAS ───────────────────────────────────────────────────────────────────
function initViews() {
    const btnTable = document.getElementById('btnTableView');
    const btnGallery = document.getElementById('btnGalleryView');
    if (btnTable) btnTable.addEventListener('click', () => { currentView = 'table'; updateViewUI(); render(); });
    if (btnGallery) btnGallery.addEventListener('click', () => { currentView = 'gallery'; updateViewUI(); render(); });

    const isMobile = window.innerWidth < 768;
    const tableView = document.getElementById('tableView');
    const galleryView = document.getElementById('galleryView');
    if (!isMobile) {
        tableView.style.display = 'block';
        galleryView.style.display = 'none';
    }
}

function updateViewUI() {
    const btnTable = document.getElementById('btnTableView');
    const btnGallery = document.getElementById('btnGalleryView');
    const tableView = document.getElementById('tableView');
    const galleryView = document.getElementById('galleryView');
    if (!btnTable || window.innerWidth < 768) return;

    if (currentView === 'table') {
        btnTable.classList.add('bg-zinc-800', 'text-white', 'shadow-sm');
        btnTable.classList.remove('text-zinc-500', 'hover:text-white');
        btnGallery.classList.remove('bg-zinc-800', 'text-white', 'shadow-sm');
        btnGallery.classList.add('text-zinc-500', 'hover:text-white');
        tableView.style.display = 'block';
        galleryView.style.display = 'none';
    } else {
        btnGallery.classList.add('bg-zinc-800', 'text-white', 'shadow-sm');
        btnGallery.classList.remove('text-zinc-500', 'hover:text-white');
        btnTable.classList.remove('bg-zinc-800', 'text-white', 'shadow-sm');
        btnTable.classList.add('text-zinc-500', 'hover:text-white');
        tableView.style.display = 'none';
        galleryView.style.display = 'block';
    }
}

function setupListeners() {
    document.getElementById('searchInput').addEventListener('input', render);
    document.getElementById('brandFilter').addEventListener('change', render);
    document.getElementById('genderFilter').addEventListener('change', render);
}

// ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
function render() {
    if (currentCategory === 'perfumes') renderPerfumes();
    else if (currentCategory === 'vapes') renderVapes();
    else renderBarber();
    if (typeof updateStats === 'function') updateStats();
}

// ─── PERFUMES ─────────────────────────────────────────────────────────────────
function renderPerfumes() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const brand = document.getElementById('brandFilter').value;
    const gender = document.getElementById('genderFilter').value;

    const filtered = workingPerfumes.filter(p => {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const brandStr = (p.brand || '').toLowerCase();
        const matchSearch = name.includes(search) || id.includes(search) || brandStr.includes(search);
        const matchBrand = brand === 'all' || p.brand === brand;
        const matchGender = gender === 'all' || p.gen === gender;
        return matchSearch && matchBrand && matchGender;
    });

    renderMobileCards(filtered, 'perfumes');

    setTableHeaders([
        'SKU', { text: 'Img', center: true }, 'Producto', 'Gen',
        { text: 'Costo', right: true }, { text: 'Precio Púb.', right: true, highlight: true },
        { text: 'Stock', center: true }, { text: 'Visible', center: true }, { text: 'Edit', center: true }
    ]);

    const tableBody = document.getElementById('inventoryTable');
    const gallery = document.getElementById('inventoryGallery');
    if (gallery) gallery.innerHTML = '';
    tableBody.innerHTML = '';

    filtered.forEach(p => {
        tableBody.appendChild(buildPerfumeRow(p));
        if (gallery) gallery.appendChild(buildGalleryCard(p, 'perfumes'));
    });

    document.getElementById('totalItems').textContent = filtered.length;
}

function buildPerfumeRow(p) {
    const tr = document.createElement('tr');
    tr.className = `border-b border-zinc-800 transition-all group ${!p.visible ? 'hidden-product' : ''}`;
    
    // Safety calculations
    const costVal = typeof p.cost === 'number' ? p.cost : 0;
    const priceVal = typeof p.price === 'number' ? p.price : (costVal + 500);

    tr.innerHTML = `
        <td class="px-4 py-3 font-mono text-[10px] gold-text opacity-40">${p.id || '---'}</td>
        <td class="px-4 py-3"><div class="h-9 w-9 bg-black rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden relative">
            <img src="${p.img || ''}" loading="lazy" decoding="async" class="w-full h-full object-contain absolute inset-0 m-auto" alt="${p.name || ''}" onerror="this.style.display='none'">
        </div></td>
        <td class="px-4 py-3"><div class="text-white font-semibold text-sm line-clamp-1">${p.name || 'Sin nombre'}</div>
            <div class="text-[9px] text-zinc-600 uppercase tracking-widest leading-none mt-1 flex items-center gap-2">${(p.brand || 'GENÉRICO').replace('_', ' ')} ${getAdminStatusBadge(p)}</div></td>
        <td class="px-4 py-3"><span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${getGenClass(p.gen)}">${p.gen || 'U'}</span></td>
        <td class="px-4 py-3 text-right font-mono text-zinc-500 text-xs">$ ${costVal.toLocaleString()}</td>
        <td class="px-4 py-3 text-right">
            <input type="number" class="inline-input" value="${priceVal}"
                onchange="updateField('perfumes','${p.id}','price',+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <input type="number" min="0" class="stock-input" value="${p.stock ?? ''}" placeholder="∞"
                onchange="updateField('perfumes','${p.id}','stock', this.value===''?null:+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <label class="toggle-switch">
                <input type="checkbox" ${p.visible ? 'checked' : ''} onchange="updateField('perfumes','${p.id}','visible',this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </td>
        <td class="px-4 py-3 text-center">
            <button onclick="openEditModal('perfumes','${p.id}')" class="text-zinc-600 hover:text-[#c5a059] transition-colors p-1 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
        </td>
    `;
    return tr;
}

// ─── VAPES ─────────────────────────────────────────────────────────────────
function renderVapes() {
    renderMobileCards(workingVapes, 'vapes');

    setTableHeaders([
        'SKU', { text: 'Img', center: true }, 'Producto', 'Puffs',
        { text: 'Costo', right: true }, { text: 'Precio Púb.', right: true, highlight: true },
        { text: 'Stock', center: true }, { text: 'Visible', center: true }, { text: 'Edit', center: true }
    ]);

    const tableBody = document.getElementById('inventoryTable');
    const gallery = document.getElementById('inventoryGallery');
    tableBody.innerHTML = '';
    if (gallery) gallery.innerHTML = '';

    workingVapes.forEach(v => {
        tableBody.appendChild(buildVapeRow(v));
        if (gallery) gallery.appendChild(buildGalleryCard(v, 'vapes'));
    });

    document.getElementById('totalItems').textContent = workingVapes.length;
}

function buildVapeRow(v) {
    const tr = document.createElement('tr');
    tr.className = `border-b border-zinc-800 transition-all group ${!v.visible ? 'hidden-product' : ''}`;
    
    const costVal = typeof v.cost === 'number' ? v.cost : 0;
    const priceVal = typeof v.price === 'number' ? v.price : (costVal + 500);

    tr.innerHTML = `
        <td class="px-4 py-3 font-mono text-[10px] gold-text opacity-40">${v.id || '---'}</td>
        <td class="px-4 py-3"><div class="h-9 w-9 bg-black rounded-lg border border-zinc-800 overflow-hidden relative">
            <img src="${v.img || ''}" loading="lazy" decoding="async" class="w-full h-full object-cover absolute inset-0" alt="${v.name || ''}" onerror="this.style.display='none'">
        </div></td>
        <td class="px-4 py-3"><div class="text-white font-semibold text-sm line-clamp-1">${v.name || 'Sin nombre'}</div>
            <div class="text-[9px] text-zinc-600 uppercase tracking-widest leading-none mt-1 flex items-center gap-2">${v.brand || 'GENÉRICO'} ${getAdminStatusBadge(v)}</div></td>
        <td class="px-4 py-3"><span class="text-[9px] font-bold border border-green-900/50 text-green-500 bg-green-900/10 px-1.5 py-0.5 rounded tracking-widest">${v.puffs || '0'} PUFFS</span></td>
        <td class="px-4 py-3 text-right font-mono text-zinc-500 text-xs">$ ${costVal.toLocaleString()}</td>
        <td class="px-4 py-3 text-right">
            <input type="number" class="inline-input" value="${priceVal}"
                onchange="updateField('vapes','${v.id}','price',+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <input type="number" min="0" class="stock-input" value="${v.stock ?? ''}" placeholder="∞"
                onchange="updateField('vapes','${v.id}','stock', this.value===''?null:+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <label class="toggle-switch">
                <input type="checkbox" ${v.visible ? 'checked' : ''} onchange="updateField('vapes','${v.id}','visible',this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </td>
        <td class="px-4 py-3 text-center">
            <button onclick="openEditModal('vapes','${v.id}')" class="text-zinc-600 hover:text-[#c5a059] transition-colors p-1 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
        </td>
    `;
    return tr;
}

// ─── INSUMOS DE BARBERÍA ───────────────────────────────────────────────────
function renderBarber() {
    renderMobileCards(workingBarber, 'barber');

    setTableHeaders([
        'SKU', { text: 'Img', center: true }, 'Producto', 'Marca',
        { text: 'Costo', right: true }, { text: 'Precio Púb.', right: true, highlight: true },
        { text: 'Stock', center: true }, { text: 'Visible', center: true }, { text: 'Edit', center: true }
    ]);

    const tableBody = document.getElementById('inventoryTable');
    const gallery = document.getElementById('inventoryGallery');
    tableBody.innerHTML = '';
    if (gallery) gallery.innerHTML = '';

    workingBarber.forEach(b => {
        tableBody.appendChild(buildBarberRow(b));
        if (gallery) gallery.appendChild(buildGalleryCard(b, 'barber'));
    });

    document.getElementById('totalItems').textContent = workingBarber.length;
}

function buildBarberRow(b) {
    const tr = document.createElement('tr');
    tr.className = `border-b border-zinc-800 transition-all group ${!b.visible ? 'hidden-product' : ''}`;
    
    const costVal = typeof b.cost === 'number' ? b.cost : 0;
    const priceVal = typeof b.price === 'number' ? b.price : (costVal + 500);

    tr.innerHTML = `
        <td class="px-4 py-3 font-mono text-[10px] gold-text opacity-40">${b.id || '---'}</td>
        <td class="px-4 py-3"><div class="h-9 w-9 bg-black rounded-lg border border-zinc-800 overflow-hidden relative">
            <img src="${b.img || ''}" loading="lazy" decoding="async" class="w-full h-full object-cover absolute inset-0" alt="${b.name || ''}" onerror="this.style.display='none'">
        </div></td>
        <td class="px-4 py-3"><div class="text-white font-semibold text-sm line-clamp-1">${b.name || 'Sin nombre'}</div>
            <div class="text-[9px] text-zinc-600 uppercase tracking-widest leading-none mt-1 flex items-center gap-2">${b.description || ''} ${getAdminStatusBadge(b)}</div></td>
        <td class="px-4 py-3 text-zinc-400 text-xs">${b.brand || '---'}</td>
        <td class="px-4 py-3 text-right font-mono text-zinc-500 text-xs">$ ${costVal.toLocaleString()}</td>
        <td class="px-4 py-3 text-right">
            <input type="number" class="inline-input" value="${priceVal}"
                onchange="updateField('barber','${b.id}','price',+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <input type="number" min="0" class="stock-input" value="${b.stock ?? ''}" placeholder="∞"
                onchange="updateField('barber','${b.id}','stock', this.value===''?null:+this.value)" onclick="this.select()">
        </td>
        <td class="px-4 py-3 text-center">
            <label class="toggle-switch">
                <input type="checkbox" ${b.visible ? 'checked' : ''} onchange="updateField('barber','${b.id}','visible',this.checked)">
                <span class="toggle-slider"></span>
            </label>
        </td>
        <td class="px-4 py-3 text-center">
            <button onclick="openEditModal('barber','${b.id}')" class="text-zinc-600 hover:text-[#c5a059] transition-colors p-1 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
        </td>
    `;
    return tr;
}

// Agregar nuevo insumo de barbería
function addBarberItem() {
    const newId = 'BAR-' + String(workingBarber.length + 1).padStart(3, '0');
    const newItem = {
        id: newId,
        name: 'Nuevo Insumo',
        brand: 'Blessed',
        price: 0,
        cost: 0,
        stock: null,
        visible: true,
        img: '',
        description: ''
    };
    workingBarber.push(newItem);
    markUnsaved();
    render();
    // Abrir modal para editar inmediatamente
    setTimeout(() => openEditModal('barber', newId), 100);
}

// ─── TABLA HEADERS ────────────────────────────────────────────────────────────
function setTableHeaders(headers) {
    const row = document.getElementById('theadRow');
    row.innerHTML = headers.map(h => {
        if (typeof h === 'string') return `<th class="px-4 py-4 font-semibold">${h}</th>`;
        return `<th class="px-4 py-4 font-semibold ${h.center ? 'text-center' : ''} ${h.right ? 'text-right' : ''} ${h.highlight ? 'text-white' : ''}">${h.text}</th>`;
    }).join('');
}

// ─── MOBILE CARDS ─────────────────────────────────────────────────────────────
function renderMobileCards(items, category) {
    const container = document.getElementById('mobileCardList');
    if (!container) return;
    container.innerHTML = '';

    items.forEach(item => {
        const isHidden = item.visible === false;
        const card = document.createElement('div');
        card.className = `mobile-card bg-zinc-900 border ${isHidden ? 'border-dashed border-zinc-700' : 'border-zinc-800'} rounded-2xl overflow-hidden ${isHidden ? 'hidden-product' : ''}`;

        const badge = category === 'vapes'
            ? `<span class="text-[9px] font-bold border border-green-900/50 text-green-500 bg-green-900/10 px-1.5 py-0.5 rounded">${item.puffs} PUFFS</span>`
            : category === 'barber'
                ? `<span class="text-[9px] font-bold border border-amber-900/50 text-amber-400 bg-amber-900/10 px-1.5 py-0.5 rounded">BARBERÍA</span>`
                : `<span class="text-[9px] font-bold border px-1.5 py-0.5 rounded ${getGenClass(item.gen)}">${item.gen}</span>`;

        card.innerHTML = `
            <div class="flex items-center gap-3 p-3">
                <div class="h-14 w-14 shrink-0 bg-black rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center">
                    <img src="${item.img}" class="w-full h-full ${category === 'perfumes' ? 'object-contain' : 'object-cover'}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        ${badge}
                        ${getAdminStatusBadge(item)}
                        ${isHidden ? `<span class="text-[9px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">oculto</span>` : ''}
                    </div>
                    <p class="text-white font-semibold text-sm leading-tight truncate">${item.name || 'Sin nombre'}</p>
                    <p class="text-zinc-600 text-[10px] uppercase tracking-widest font-semibold mt-0.5">${item.brand || 'GENÉRICO'}</p>
                </div>
                <div class="shrink-0 flex flex-col items-end gap-2">
                    <span class="text-[#c5a059] font-black font-mono text-base leading-none">$${(item.price || 0).toLocaleString()}</span>
                    <button onclick="openEditModal('${category}','${item.id}')"
                        class="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-[#c5a059] border border-zinc-800 hover:border-[#c5a059]/50 px-3 py-1.5 rounded-lg transition-all">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Editar
                    </button>
                </div>
            </div>
            <div class="border-t border-zinc-800 px-3 py-2.5 flex items-center justify-between gap-4 bg-black/30">
                <div class="flex items-center gap-2">
                    <span class="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Stock</span>
                    <div class="flex items-center gap-1">
                        <button onclick="adjustStock('${category}','${item.id}',-1)" class="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition-colors">-</button>
                        <input type="number" min="0" value="${item.stock ?? ''}" placeholder="∞" inputmode="numeric"
                            class="mobile-edit-input !py-1.5 !px-2 !w-14 text-center text-xs"
                            onchange="updateField('${category}','${item.id}','stock', this.value===''?null:+this.value)">
                        <button onclick="adjustStock('${category}','${item.id}',+1)" class="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition-colors">+</button>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Visible</span>
                    <label class="toggle-switch toggle-switch-lg">
                        <input type="checkbox" ${item.visible !== false ? 'checked' : ''} onchange="updateField('${category}','${item.id}','visible',this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ─── GALLERY CARD (desktop) ───────────────────────────────────────────────────
function buildGalleryCard(item, category) {
    const card = document.createElement('div');
    card.className = `bg-zinc-900 border ${item.visible ? 'border-zinc-800' : 'border-dashed border-zinc-700 opacity-50'} rounded-2xl overflow-hidden shadow-lg flex flex-col h-full`;
    card.innerHTML = `
        <div class="relative bg-black h-40 p-3 flex items-center justify-center border-b border-zinc-800/50 overflow-hidden">
            <div class="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">${getAdminStatusBadge(item)}</div>
            ${!item.visible ? `<span class="absolute top-2 right-2 text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded z-10">OCULTO</span>` : ''}
            <img src="${item.img}" loading="lazy" class="w-full h-full ${category === 'perfumes' ? 'object-contain' : 'object-cover'}" alt="${item.name}" onerror="this.style.display='none'">
        </div>
        <div class="p-4 flex flex-col flex-1">
            <h3 class="text-white font-bold text-sm leading-tight mb-3 line-clamp-2">${item.name}</h3>
            <div class="mt-auto pt-3 border-t border-zinc-800/50 flex justify-between items-center">
                <button onclick="openEditModal('${category}','${item.id}')" class="text-xs text-zinc-500 hover:text-[#c5a059] transition-colors font-bold">Editar</button>
                <span class="text-[#c5a059] font-black font-mono">$ ${item.price.toLocaleString()}</span>
            </div>
        </div>
    `;
    return card;
}

// ─── EDICIÓN INLINE ───────────────────────────────────────────────────────────
function updateField(category, id, field, value) {
    const arr = category === 'perfumes' ? workingPerfumes : category === 'vapes' ? workingVapes : workingBarber;
    const item = arr.find(x => x.id === id);
    if (item) {
        item[field] = value;
        markUnsaved();
        if (field === 'visible') render();
    }
}

// Ajustar stock con botones +/-
function adjustStock(category, id, delta) {
    const arr = category === 'perfumes' ? workingPerfumes : category === 'vapes' ? workingVapes : workingBarber;
    const item = arr.find(x => x.id === id);
    if (!item) return;
    const current = item.stock ?? 0;
    item.stock = Math.max(0, current + delta);
    markUnsaved();
    render();
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openEditModal(category, id) {
    let item;
    if (id === 'new') {
        item = {
            id: 'new',
            name: '', cost: 0, price: 0, stock: null, visible: true, status: 'available', img: '',
            brand: category === 'perfumes' ? 'OTROS' : (category === 'vapes' ? 'GENERICO' : 'INSUMOS'),
            description: '', discount: 0
        };
        document.getElementById('editModalSKU').textContent = 'NUEVO';
    } else {
        const arr = category === 'perfumes' ? workingPerfumes : category === 'vapes' ? workingVapes : workingBarber;
        item = arr.find(x => x.id === id);
        if (!item) return;
        document.getElementById('editModalSKU').textContent = id;
    }
    
    editingId = { category, id };

    document.getElementById('editName').value = item.name;
    document.getElementById('editCost').value = item.cost || 0;
    document.getElementById('editPrice').value = item.price || 0;
    document.getElementById('editStock').value = item.stock ?? '';
    document.getElementById('editVisible').checked = item.visible !== false;
    document.getElementById('editStatus').value = item.status || 'available';
    document.getElementById('editImgPreview').src = item.img || 'https://via.placeholder.com/300x300/111111/c5a059?text=Nuevo';
    document.getElementById('editImgFile').value = '';

    const brandEl = document.getElementById('editBrand');
    if (brandEl) brandEl.value = item.brand || '';
    
    const descEl = document.getElementById('editDescription');
    if (descEl) descEl.value = item.description || '';
    
    const discEl = document.getElementById('editDiscount');
    if (discEl) discEl.value = item.discount || 0;

    const modal = document.getElementById('editModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.innerWidth >= 768) setTimeout(() => document.getElementById('editName').focus(), 100);
}

function saveEditModal() {
    if (!editingId) return;
    const { category, id } = editingId;
    const arr = category === 'perfumes' ? workingPerfumes : category === 'vapes' ? workingVapes : workingBarber;
    
    let item;
    if (id === 'new') {
        const idPrefix = category === 'perfumes' ? 'PER-' : (category === 'vapes' ? 'VAP-' : 'BAR-');
        item = { id: idPrefix + Date.now().toString().slice(-6) };
        if (category === 'perfumes') item.gen = 'U';
        arr.unshift(item); // Agregar al inicio
    } else {
        item = arr.find(x => x.id === id);
    }
    
    if (!item) return;

    item.name = document.getElementById('editName').value.trim();
    item.cost = +document.getElementById('editCost').value;
    item.price = +document.getElementById('editPrice').value;
    const sv = document.getElementById('editStock').value;
    item.stock = sv === '' ? null : +sv;
    item.visible = document.getElementById('editVisible').checked;
    item.status = document.getElementById('editStatus').value;
    
    const brandEl = document.getElementById('editBrand');
    if (brandEl) item.brand = brandEl.value.trim().toUpperCase() || 'GENERICO';
    
    const descEl = document.getElementById('editDescription');
    if (descEl) item.description = descEl.value.trim();
    
    const discEl = document.getElementById('editDiscount');
    if (discEl) item.discount = +discEl.value || 0;

    const previewSrc = document.getElementById('editImgPreview').src;
    if (previewSrc.startsWith('data:image/')) {
        item.img = previewSrc;
    } else if (id === 'new' && !item.img) {
        item.img = 'https://via.placeholder.com/300x300/111111/c5a059?text=Nuevo';
    }

    markUnsaved();
    closeEditModal();
    render();
}

// ─── AGREGAR NUEVO ITEM ───────────────────────────────────────────────────────
function addNewItem() {
    openEditModal(currentCategory, 'new');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    editingId = null;
}

document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeEditModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal(); });

// ─── MANEJO DE IMÁGENES (Subida y Compresión a WebP) ──────────────────────────
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image.*/)) {
        showToast('⚠ Solo se permiten imágenes', 'error');
        return;
    }

    // Mostrar estado de carga
    const preview = document.getElementById('editImgPreview');
    const oldSrc = preview.src;
    preview.src = 'https://via.placeholder.com/300x300/111111/c5a059?text=Cargando...';

    try {
        const compressedBase64 = await compressImageToWebP(file);
        preview.src = compressedBase64;
    } catch (e) {
        console.error('Error comprimiendo imagen:', e);
        showToast('✗ Error al procesar imagen', 'error');
        preview.src = oldSrc;
    }
}

function compressImageToWebP(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Tamaño máximo 600x600 px para ahorrar espacio en JSONBin
                const MAX_SIZE = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                // Rellenar con blanco por si tiene transparencia y se pasa a algo sin alfa
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a WebP con calidad 80%
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── BORRAR PRODUCTO ────────────────────────────────────────────────────────
function deleteCurrentItem() {
    if (!editingId) return;
    
    if (!confirm('¿Seguro que quieres borrar este producto? Se eliminará inmediatamente y la imagen se purgará del sistema. Esta acción no se puede deshacer.')) return;
    
    const { category, id } = editingId;
    let arr;
    if (category === 'perfumes') arr = workingPerfumes;
    else if (category === 'vapes') arr = workingVapes;
    else arr = workingBarber;

    const index = arr.findIndex(x => x.id === id);
    if (index !== -1) {
        arr.splice(index, 1);
        markUnsaved();
        closeEditModal();
        render();
        showToast('🗑 Producto eliminado', 'success');
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getAdminStatusBadge(item) {
    let st = item.status || 'available';
    if (st === 'available' && item.stock !== null && item.stock !== undefined && item.stock <= 0) st = 'out_of_stock';
    
    if (st === 'available') return '';
    
    let label = '';
    let classes = '';

    switch(st) {
        case 'house': label = 'DE LA CASA'; classes = 'border-purple-500/50 text-purple-400 bg-purple-900/30'; break;
        case 'unavailable': label = 'NO DISP.'; classes = 'border-zinc-700 text-zinc-400 bg-zinc-900/50'; break;
        case 'preorder': label = 'ENCARGUE'; classes = 'border-cyan-500/50 text-cyan-400 bg-cyan-900/30'; break;
        case 'out_of_stock': label = 'SIN STOCK'; classes = 'border-red-500/50 text-red-500 bg-red-900/30'; break;
        case 'low_stock': label = 'POCAS U.'; classes = 'border-orange-500/50 text-orange-400 bg-orange-900/30'; break;
    }
    
    if (!label) return '';
    return `<span class="text-[8px] font-bold border px-1.5 py-0.5 rounded tracking-widest uppercase ${classes}">${label}</span>`;
}

function getGenClass(gen) {
    if (gen === 'H') return 'border-blue-900/50 text-blue-500 bg-blue-900/10';
    if (gen === 'M') return 'border-pink-900/50 text-pink-500 bg-pink-900/10';
    return 'border-purple-900/50 text-purple-500 bg-purple-900/10';
}

function showToast(message, type) {
    const toast = document.getElementById('saveToast');
    const content = document.getElementById('toastContent');
    const styles = {
        success: 'bg-zinc-900 border-green-800/50 text-green-400',
        error: 'bg-zinc-900 border-red-800/50 text-red-400'
    };
    content.className = `flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur text-sm font-semibold ${styles[type] || styles.success}`;
    content.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

window.addEventListener('beforeunload', e => {
    if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
});

// ─── HERRAMIENTAS / CALCULADORAS ──────────────────────────────────────────────
function switchMainView(view) {
    const invSec = document.getElementById('inventorySection');
    const toolSec = document.getElementById('toolsSection');
    const tabInv = document.getElementById('tabInventory');
    const tabTool = document.getElementById('tabTools');

    if (view === 'inventory') {
        invSec.classList.remove('hidden');
        toolSec.classList.add('hidden');
        tabInv.className = "main-tab text-[#d4af37] font-bold border-b-2 border-[#d4af37] pb-3 px-1 uppercase tracking-widest text-xs md:text-sm whitespace-nowrap transition-colors";
        tabTool.className = "main-tab text-zinc-500 font-bold hover:text-white border-b-2 border-transparent pb-3 px-1 uppercase tracking-widest text-xs md:text-sm whitespace-nowrap transition-colors";
    } else {
        invSec.classList.add('hidden');
        toolSec.classList.remove('hidden');
        tabTool.className = "main-tab text-[#d4af37] font-bold border-b-2 border-[#d4af37] pb-3 px-1 uppercase tracking-widest text-xs md:text-sm whitespace-nowrap transition-colors";
        tabInv.className = "main-tab text-zinc-500 font-bold hover:text-white border-b-2 border-transparent pb-3 px-1 uppercase tracking-widest text-xs md:text-sm whitespace-nowrap transition-colors";
        // Calculate immediately when opening to prepopulate labels
        calculateMargin();
        convertCurrency();
    }
}

function calculateMargin() {
    const cost = parseFloat(document.getElementById('calcCost').value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin').value) || 0;
    const envio = parseFloat(document.getElementById('calcEnvio')?.value) || 0;
    const ivaCheck = document.getElementById('calcIva')?.checked || false;
    
    // Base cost + shipping
    let baseCost = cost + envio;
    // Add IVA to base cost if checked
    if (ivaCheck) baseCost = baseCost * 1.22;
    
    // Profit and final price based on total real cost
    const profit = baseCost * (margin / 100);
    const finalPrice = baseCost + profit;

    const resEl = document.getElementById('calcResult');
    const profEl = document.getElementById('calcProfit');
    const totEl = document.getElementById('calcTotalCostOut');
    
    if (resEl) resEl.textContent = Math.round(finalPrice).toLocaleString('es-UY');
    if (profEl) profEl.textContent = Math.round(profit).toLocaleString('es-UY');
    if (totEl) totEl.textContent = Math.round(baseCost).toLocaleString('es-UY');
}

function convertCurrency() {
    const usd = parseFloat(document.getElementById('rateUSD').value) || 1;
    const eur = parseFloat(document.getElementById('rateEUR').value) || 1;
    const brl = parseFloat(document.getElementById('rateBRL').value) || 1;

    const rates = { USD: usd, EUR: eur, BRL: brl };
    
    const amount = parseFloat(document.getElementById('amountToConvert').value) || 0;
    const from = document.getElementById('currencyFrom').value;
    
    const result = amount * rates[from];
    document.getElementById('convertedResult').textContent = Math.round(result).toLocaleString('es-UY');
}

async function fetchLiveExchangeRates() {
    const btn = event.currentTarget || event.target.closest('button');
    if (btn) btn.classList.add('spin');
    
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        const baseUYU = data.rates.UYU;
        const eurusd = data.rates.EUR;
        const brlusd = data.rates.BRL;

        // USD a UYU
        document.getElementById('rateUSD').value = baseUYU.toFixed(2);
        // 1 EUR en USD (1 / rate) * baseUYU
        document.getElementById('rateEUR').value = ((1 / eurusd) * baseUYU).toFixed(2);
        // 1 BRL en USD
        document.getElementById('rateBRL').value = ((1 / brlusd) * baseUYU).toFixed(2);

        convertCurrency();
        showToast('✓ Cotizaciones actualizadas', 'success');
    } catch (err) {
        showToast('✗ Error obteniendo cotizaciones', 'error');
    } finally {
        if (btn) setTimeout(() => btn.classList.remove('spin'), 500);
    }
}

init();
