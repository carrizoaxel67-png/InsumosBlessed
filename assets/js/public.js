let currentCategory = 'perfumes';
let publicPerfumes = [];
let publicVapes = [];
let publicBarber = [];
let publicPacks = [];

const searchInput = document.getElementById('searchInput');
let customStatuses = JSON.parse(localStorage.getItem('blessed_statuses') || '[]');
let isFullPublicCatalogue = false;

function enableFullPublicCatalogue() {
    isFullPublicCatalogue = true;
    render();
}

const brandFilter = document.getElementById('brandFilter');
const genderFilter = document.getElementById('genderFilter');
const inventoryGallery = document.getElementById('inventoryGallery');
const perfumeFilters = document.getElementById('perfumeFilters');

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────
async function initPublic() {
    setupPublicListeners();
    
    // Attempt to load from NEON (Source of truth)
    const cloudOK = await loadFromCloud();

    if (!cloudOK) {
        console.warn('[public] Error/Timeout conectando a NEON. Usando inventario local de emergencia.');
        loadLocalFallback();
    }
    
    render();
}

async function loadFromCloud() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch('/api/get-products', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) return false;
        
        const data = await res.json();
        
        if (data && data._seeded) {
            if (Array.isArray(data.perfumes)) {
                publicPerfumes = data.perfumes.filter(p => p.visible !== false);
            }
            if (Array.isArray(data.vapes)) {
                publicVapes = data.vapes.filter(v => v.visible !== false);
            }
            if (Array.isArray(data.barber)) {
                publicBarber = data.barber.filter(b => b.visible !== false);
            }
            if (Array.isArray(data.customStatuses) && data.customStatuses.length > 0) {
                customStatuses = data.customStatuses;
                customStatuses.forEach(st => {
                    statusPriority[st.id] = st.priority !== undefined ? st.priority : 2;
                });
            }
            if (Array.isArray(data.packs)) {
                publicPacks = data.packs.filter(p => p.visible !== false);
            }
            console.log(`[public] ✓ NEON cargado: ${publicPerfumes.length} perfumes`);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

function loadLocalFallback() {
    publicPerfumes = (typeof inventory !== 'undefined' ? inventory : [])
        .filter(p => p.visible !== false)
        .map(p => ({ ...p, price: p.price || p.cost + 500 }));
    publicVapes = (typeof vapeModels !== 'undefined' ? vapeModels : [])
        .filter(v => v.visible !== false)
        .map(v => ({ ...v, price: v.price || v.cost + 500 }));
    publicBarber = (typeof barberItems !== 'undefined' ? barberItems : [])
        .filter(b => b.visible !== false);
}

function setupPublicListeners() {
    searchInput.addEventListener('input', render);
    brandFilter.addEventListener('change', render);
    genderFilter.addEventListener('change', render);
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
function setCategory(cat) {
    currentCategory = cat;
    perfumeFilters.classList.toggle('hidden', cat !== 'perfumes');
    
    // Actualizar tabs de escritorio si existen
    document.querySelectorAll('[id^="catTab"]').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById('catTab' + cat.charAt(0).toUpperCase() + cat.slice(1));
    if (activeTab) activeTab.classList.add('active');
    
    // Vapes: ocultar tab si no está activo
    const vapesTab = document.getElementById('catTabVapes');
    if (vapesTab) vapesTab.classList.toggle('hidden', cat !== 'vapes');
    if (vapesTab && cat === 'vapes') vapesTab.classList.remove('hidden');
    
    // Actualizar counters en mobile menu 2
    const m2 = document.getElementById('totalItemsMobile2');
    const l2 = document.getElementById('itemsLabelMobile2');
    if (m2 && l2) { m2.textContent = '...'; l2.textContent = ''; }
    
    render();
}

// Vapes sigue siendo secreto (trigger por logo o búsqueda)
function toggleSecretCategory() {
    if (currentCategory === 'vapes') {
        setCategory('perfumes');
    } else {
        checkAgeAndSetCategory('vapes');
    }
}

// ─── VERIFICACIÓN +18 ─────────────────────────────────────────────────────────
function checkAgeAndSetCategory(cat) {
    if (cat === 'vapes') {
        const modal = document.getElementById('ageModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Timeout para dar tiempo al navegador de renderizar el display flex
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
                modal.firstElementChild.classList.add('scale-100');
            }, 10);
            
            // Pausar overflow para no scrollear fondo
            document.body.style.overflow = 'hidden';
            return; // Detener flujo hasta que acepte
        }
    }
    setCategory(cat);
}

function acceptAgeWarning() {
    closeAgeModal();
    setCategory('vapes');
}

function declineAgeWarning() {
    closeAgeModal();
    setCategory('perfumes');
}

function closeAgeModal() {
    const modal = document.getElementById('ageModal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.firstElementChild.classList.remove('scale-100');
    modal.firstElementChild.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}


// ─── MOBILE MENU ──────────────────────────────────────────────────────────────
const mobileMenu = document.getElementById('mobileMenu');
function toggleMobileMenu() {
    const open = !mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden', open);
    mobileMenu.classList.toggle('flex', !open);
    document.body.style.overflow = open ? '' : 'hidden';
}

function selectCategoryMobile(cat) {
    setCategory(cat);
    document.querySelectorAll('.mobile-menu-item').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    toggleMobileMenu();
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render() {
    if (inventoryGallery) inventoryGallery.innerHTML = '';

    const searchStr = searchInput.value.toLowerCase().trim();
    // Secret trigger para vapes
    if (['vape', 'vapos', 'descartable'].includes(searchStr)) {
        searchInput.value = '';
        checkAgeAndSetCategory('vapes');
        return; // checkAgeAndSetCategory llamará a render si corresponde
    }

    if (currentCategory === 'perfumes') renderPerfumes();
    else if (currentCategory === 'vapes') renderVapes();
    else renderBarber();
}

// ─── ORDENAMIENTO POR ESTADO ──────────────────────────────────────────────────
// ─── ORDENAMIENTO POR ESTADO ──────────────────────────────────────────────────
const statusPriority = {
    'house': 0,         // Producto estrella de la casa (0, el primero de todos)
    'low_stock': 1,     // Pocas unidades (2do)
    'available': 2,     // Disponibles normal (3ro)
    'preorder': 3,      // Por encargo (4to)
    'out_of_stock': 4,  // Sin stock (5to)
    'unavailable': 5    // No disponible (Último)
};

function sortProductsByStatus(arr) {
    return arr.sort((a, b) => {
        // Prioridad absoluta a productos con oferta
        if ((a.offerBadge ? 1 : 0) !== (b.offerBadge ? 1 : 0)) {
            return (b.offerBadge ? 1 : 0) - (a.offerBadge ? 1 : 0);
        }

        let pA = statusPriority[a.status || 'available'] ?? 2;
        let pB = statusPriority[b.status || 'available'] ?? 2;
        
        // Mapeo legacy
        if (a.status === 'available' && a.stock !== null && a.stock !== undefined && a.stock <= 0) pA = statusPriority['out_of_stock'];
        if (b.status === 'available' && b.stock !== null && b.stock !== undefined && b.stock <= 0) pB = statusPriority['out_of_stock'];
        
        return pA - pB;
    });
}

function getOfferBadgeTag(item) {
    if (!item.offerBadge) return '';
    return `<span class="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-lg z-20" style="background:${item.offerBadgeColor||'#ef4444'}; color:${item.offerBadgeTextColor||'#fff'}; border: 1px solid ${item.offerBadgeColor||'#ef4444'}">${item.offerBadge}</span>`;
}

// ─── PERFUMES ─────────────────────────────────────────────────────────────────
function renderPerfumes() {
    const search = searchInput.value.toLowerCase().trim();
    const brand  = brandFilter.value;
    const gender = genderFilter.value;

    const filtered = publicPerfumes.filter(p => {
        const name = (p.name || '').toLowerCase();
        const brandStr = (p.brand || '').toLowerCase();
        const matchSearch = name.includes(search) || brandStr.includes(search);
        const matchBrand  = brand === 'all' || p.brand === brand;
        const matchGender = gender === 'all' || p.gen === gender;
        return matchSearch && matchBrand && matchGender;
    });

    const isDirtyFilter = search !== '' || brand !== 'all' || gender !== 'all';
    const isAvonMode = !isFullPublicCatalogue && !isDirtyFilter;

    // Elementos DOM del Avon Mode
    const avonHeader = document.getElementById('avonModeHeader');
    const loadBtn = document.getElementById('loadFullCatalogueBtn');
    
    if (avonHeader) avonHeader.classList.toggle('hidden', !isAvonMode);
    if (loadBtn) loadBtn.classList.toggle('hidden', !isAvonMode || filtered.length <= 8);

    // Renderizar Combos (Sólo si no hay filtros o si estamos en Avon Mode)
    if (publicPacks && publicPacks.length > 0 && !isDirtyFilter) {
        publicPacks.forEach((pack, i) => {
            const card = document.createElement('div');
            card.className = `product-card animate-fade-in-up bg-zinc-900/40 border border-[#c5a059]/30 col-span-1 md:col-span-2 row-span-2 shadow-[0_0_20px_rgba(197,160,89,0.05)]`;
            card.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
            card.style.opacity = '0';
            card.onclick = () => showInfo(pack, 'pack');
            card.innerHTML = `
                <div class="card-img-wrap h-40 md:h-64 p-4">
                    <span class="absolute top-3 left-3 text-[9px] font-black border border-[#c5a059]/50 text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded-md backdrop-blur-md z-10">COMBO / PACK</span>
                    <img src="${pack.img}" loading="lazy" decoding="async" class="w-full h-full object-contain" alt="${pack.name}" onerror="this.style.display='none'">
                </div>
                <div class="p-4 flex flex-col flex-1 bg-gradient-to-t from-[#050505] to-transparent">
                    <p class="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-1">${pack.items.length} PRODUCTOS</p>
                    <h3 class="text-[#c5a059] font-black text-[16px] md:text-lg leading-tight mb-2 line-clamp-2">${pack.name}</h3>
                    <p class="text-[10px] md:text-xs text-zinc-400 font-semibold mb-auto line-clamp-3">${pack.items.map(it => it.name).join(' + ')}</p>
                    <div class="mt-4 pt-3.5 border-t border-[#c5a059]/20 flex justify-between items-center relative">
                        <span class="text-[10px] text-[#c5a059] opacity-70 font-semibold absolute -top-5 left-0">Precio Promo</span>
                        <span class="text-white font-black font-mono text-xl">$ ${pack.price.toLocaleString()}</span>
                    </div>
                </div>
            `;
            inventoryGallery.appendChild(card);
        });
    }

    const sorted = sortProductsByStatus(filtered);
    const itemsToShow = isAvonMode ? sorted.slice(0, 8) : sorted;

    itemsToShow.forEach((p, i) => {
        const isHouse = p.status === 'house';
        const card = document.createElement('div');
        card.className = `product-card animate-fade-in-up ${isHouse ? 'card-house' : ''}`;
        card.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
        card.style.opacity = '0';
        card.onclick = () => showInfo(p, 'perfume');
        card.innerHTML = `
            <div class="card-img-wrap h-48 md:h-60">
                <span class="absolute top-3 left-3 text-[9px] font-black border px-1.5 py-0.5 rounded-md backdrop-blur-md ${getGenClass(p.gen)} z-10">${p.gen}</span>
                ${getOfferBadgeTag(p)}
                ${getStatusTag(p)}
                <img src="${p.img}" loading="lazy" decoding="async" class="w-full h-full object-contain" alt="${p.name || 'Producto'}" onerror="this.style.display='none'">
            </div>
            <div class="p-4 flex flex-col flex-1">
                <p class="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-bold mb-1">${(p.brand || 'GENERICO').replace('_', ' ')}</p>
                <h3 class="text-white font-bold text-[15px] md:text-base leading-tight mb-auto line-clamp-2">${p.name || 'Sin nombre'}</h3>
                <div class="mt-4 pt-3.5 border-t border-zinc-800/60 flex justify-between items-center relative">
                    <span class="text-[10px] text-zinc-600 font-semibold absolute -top-5 left-0">Precio final</span>
                    ${p.offerPrice 
                        ? `<div class="flex flex-col"><span class="text-[#c5a059] font-black font-mono text-lg leading-none">$ ${p.offerPrice.toLocaleString()}</span><span class="text-zinc-600 text-[10px] line-through font-mono mt-0.5">$ ${p.price.toLocaleString()}</span></div>` 
                        : `<span class="text-[#c5a059] font-black font-mono text-lg">$ ${p.price.toLocaleString()}</span>`
                    }
                </div>
            </div>
        `;
        inventoryGallery.appendChild(card);
    });

    updateCounters(filtered.length, 'Fragancias');
}


// ─── VAPES ────────────────────────────────────────────────────────────────────
function renderVapes() {
    const sorted = sortProductsByStatus([...publicVapes]);
    sorted.forEach((v, i) => {
        const card = document.createElement('div');
        card.className = 'product-card animate-fade-in-up';
        card.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
        card.style.opacity = '0';
        card.onclick = () => showInfo(v, 'vape');
        card.innerHTML = `
            <div class="card-img-wrap h-40 md:h-52">
                <span class="absolute top-3 left-3 text-[9px] font-black border border-green-900/50 text-green-400 bg-green-900/15 px-1.5 py-0.5 rounded-md backdrop-blur-md z-10">${v.puffs} PUFFS</span>
                ${getOfferBadgeTag(v)}
                ${getStatusTag(v)}
                <img src="${v.img}" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${v.name}" onerror="this.style.display='none'">
            </div>
            <div class="p-4 flex flex-col flex-1">
                <p class="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-bold mb-1">${v.brand}</p>
                <h3 class="text-white font-bold text-[15px] md:text-base leading-tight mb-auto line-clamp-2">${v.name}</h3>
                <div class="mt-4 pt-3.5 border-t border-zinc-800/60 flex justify-between items-center relative">
                    <span class="text-[10px] text-zinc-600 font-semibold absolute -top-5 left-0">Precio final</span>
                    ${v.offerPrice 
                        ? `<div class="flex flex-col"><span class="text-[#c5a059] font-black font-mono text-lg leading-none">$ ${v.offerPrice.toLocaleString()}</span><span class="text-zinc-600 text-[10px] line-through font-mono mt-0.5">$ ${v.price.toLocaleString()}</span></div>` 
                        : `<span class="text-[#c5a059] font-black font-mono text-lg">$ ${v.price.toLocaleString()}</span>`
                    }
                </div>
            </div>
        `;
        inventoryGallery.appendChild(card);
    });
    updateCounters(publicVapes.length, 'Modelos');
}


// ─── INSUMOS DE BARBERÍA ──────────────────────────────────────────────────────
function renderBarber() {
    if (publicBarber.length === 0) {
        inventoryGallery.innerHTML = `
            <div class="col-span-full text-center py-24 text-zinc-600 animate-fade-in-up">
                <svg class="w-16 h-16 mx-auto mb-6 text-zinc-700/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
                <p class="font-black uppercase tracking-widest text-sm gold-text">Próximamente</p>
                <p class="text-xs mt-2">Insumos de barbería disponibles pronto</p>
            </div>`;
        updateCounters(0, 'Insumos');
        return;
    }
    const sorted = sortProductsByStatus([...publicBarber]);
    sorted.forEach((b, i) => {
        const isHouse = b.status === 'house';
        const card = document.createElement('div');
        card.className = `product-card animate-fade-in-up ${isHouse ? 'card-house' : ''}`;
        card.style.animationDelay = `${Math.min(i * 0.05, 0.4)}s`;
        card.style.opacity = '0';
        card.onclick = () => showInfo(b, 'barber');
        card.innerHTML = `
            <div class="card-img-wrap h-48 md:h-60 p-4">
                <span class="absolute top-3 left-3 text-[9px] font-black border border-amber-900/50 text-amber-400 bg-amber-900/15 px-1.5 py-0.5 rounded-md z-10">✂ BARBERÍA</span>
                ${getOfferBadgeTag(b)}
                ${getStatusTag(b)}
                <img src="${b.img}" loading="lazy" decoding="async" class="w-full h-full object-contain" alt="${b.name}" onerror="this.parentElement.querySelector('.img-ph')?.classList.remove('hidden')">
                <div class="img-ph hidden absolute inset-0 flex items-center justify-center text-zinc-800">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
                </div>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <p class="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-bold mb-1">${b.brand}</p>
                <h3 class="text-white font-bold text-[15px] md:text-base leading-tight mb-auto line-clamp-2">${b.name}</h3>
                <div class="mt-4 pt-3.5 border-t border-zinc-800/60 flex justify-between items-center relative">
                    <span class="text-[10px] text-zinc-600 font-semibold absolute -top-5 left-0">Precio final</span>
                    ${b.offerPrice 
                        ? `<div class="flex flex-col"><span class="text-[#c5a059] font-black font-mono text-lg leading-none">$ ${b.offerPrice.toLocaleString()}</span><span class="text-zinc-600 text-[10px] line-through font-mono mt-0.5">$ ${b.price.toLocaleString()}</span></div>` 
                        : `<span class="text-[#c5a059] font-black font-mono text-lg">$ ${b.price.toLocaleString()}</span>`
                    }
                </div>
            </div>
        `;
        inventoryGallery.appendChild(card);
    });
    updateCounters(publicBarber.length, 'Insumos');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getStatusTag(item) {
    let st = item.status || 'available';
    // Mapeo legacy: si stock es 0 y el status estaba normal, forzar out_of_stock
    if (st === 'available' && item.stock !== null && item.stock !== undefined && item.stock <= 0) {
        st = 'out_of_stock';
    }

    if (st === 'available') return '';

    let label = '';
    let classes = '';

    switch(st) {
        case 'house':
            label = 'PRODUCTO DE LA CASA';
            classes = 'bg-black/90 text-[#c5a059] border border-[#c5a059] backdrop-blur-md shadow-[0_0_15px_rgba(197,160,89,0.3)] !px-4 !py-2';
            return `<span class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><span class="text-[10px] md:text-sm font-black tracking-widest uppercase rounded-xl ${classes}">${label}</span></span>`;
        case 'unavailable':
            label = 'NO DISPONIBLE';
            classes = 'bg-zinc-900/80 text-zinc-400 border border-zinc-700 backdrop-blur-sm';
            break;
        case 'preorder':
            label = 'POR ENCARGUE';
            classes = 'bg-cyan-900/80 text-cyan-400 border border-cyan-500/50 backdrop-blur-sm';
            break;
        case 'out_of_stock':
            label = 'SIN STOCK';
            classes = 'bg-red-900/80 text-red-500 border border-red-500/50 backdrop-blur-sm';
            break;
        case 'low_stock':
            label = 'POCAS UNIDADES';
            classes = 'bg-orange-900/80 text-orange-400 border border-orange-500/50 backdrop-blur-sm';
            break;
    }

    if (!label) {
        const custom = customStatuses.find(s => s.id === st || s.label === st);
        if (custom) {
            return `<span class="absolute inset-0 bg-black/40 flex items-center justify-center z-20 pointer-events-none"><span class="text-[10px] md:text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-xl" style="background-color: ${custom.color}; color: ${custom.textColor}; border: 1px solid ${custom.color}">${custom.label}</span></span>`;
        }
        return '';
    }
    return `<span class="absolute inset-0 bg-black/40 flex items-center justify-center z-20 pointer-events-none"><span class="text-[10px] md:text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-xl ${classes}">${label}</span></span>`;
}

function getStatusBadge(status) {
    if (!status || status === 'available') return '';
    
    // Check custom statuses
    const custom = customStatuses.find(s => s.id === status || s.label === status);
    if (custom) {
        return `<span class="dynamic-badge" style="background-color: ${custom.color}; color: ${custom.textColor}">${custom.label}</span>`;
    }

    const config = {
        'low_stock': { label: 'Pocas Unidades', class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        'out_of_stock': { label: 'Sin Stock', class: 'bg-red-500/10 text-red-500 border-red-500/20' },
        'house': { label: 'De la Casa', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
        'preorder': { label: 'Por Encargue', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
    };

    const c = config[status];
    if (!c) return `<span class="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">${status.toUpperCase()}</span>`;

    return `<span class="${c.class} border px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">${c.label}</span>`;
}

function updateCounters(count, label) {
    const d  = document.getElementById('totalItemsDesktop');
    const m  = document.getElementById('totalItemsMobile');
    const m2 = document.getElementById('totalItemsMobile2');
    const l  = document.getElementById('itemsLabelMobile');
    const l2 = document.getElementById('itemsLabelMobile2');
    if (d)  d.textContent  = count;
    if (m)  m.textContent  = count;
    if (m2) m2.textContent = count;
    if (l)  l.textContent  = label;
    if (l2) l2.textContent = label;
}

function getGenClass(gen) {
    if (gen === 'H') return 'border-blue-900/50 text-blue-500 bg-blue-900/10';
    if (gen === 'M') return 'border-pink-900/50 text-pink-500 bg-pink-900/10';
    return 'border-purple-900/50 text-purple-500 bg-purple-900/10';
}

function showInfo(item, type) {
    document.getElementById('modalTitle').textContent = item.name;
    document.getElementById('modalBrand').textContent =
        type === 'perfume' ? item.brand.replace('_', ' ') : item.brand;
        
    const descEl = document.getElementById('modalDesc');
    if (descEl) {
        if (type === 'pack') {
            descEl.innerHTML = `<p class="text-[#c5a059] font-bold text-xs uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">Incluye:</p> <ul class="list-disc pl-4 text-xs space-y-1">${item.items.map(it => `<li>${it.name}</li>`).join('')}</ul>`;
            descEl.classList.remove('hidden');
        } else if (item.description) {
            descEl.textContent = item.description;
            descEl.classList.remove('hidden');
        } else {
            descEl.classList.add('hidden');
        }
    }

    const mImg = document.getElementById('mImg');
    mImg.src = item.img;
    const finalPrice = item.offerPrice || item.price;
    document.getElementById('mFinal').textContent = finalPrice.toLocaleString();

    const waBtn = document.getElementById('btnBuyWA');
    if (waBtn) {
        let productLabel = 'perfume';
        if (type === 'vape') productLabel = 'vaporizador';
        else if (type === 'barber') productLabel = 'insumo de barbería';
        else if (type === 'pack') productLabel = 'combo';
        
        const msg = encodeURIComponent(`¡Hola! Me interesa comprar el ${productLabel} ${item.name} a $${finalPrice}. ¿Tienen stock?`);
        waBtn.href = `https://wa.me/59892549474?text=${msg}`;
    }

    const modal = document.getElementById('infoModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('infoModal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

initPublic();
