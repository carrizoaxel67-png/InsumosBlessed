// ─── SETMORE MODO BARBERÍA (DASHBOARD) ──────────────────────────────────────────
// Fetch y visualización de reservas e ingresos desde API de Setmore proxy o Mock.

let setmoreChartInstance = null;
let currentPeriod = 'day'; // day, week, month
let rawAppointments = [];
let setmoreInitialized = false;

// ─── INIT (llamado directamente desde admin.html switchSection) ───────────────
function initSetmoreModule() {
    if (setmoreInitialized && rawAppointments.length > 0) return; // Ya cargado
    loadSetmoreData();
}

// ─── FETCH & MOCK (Data Layer) ────────────────────────────────────────────────
async function loadSetmoreData() {
    const list = document.getElementById('smAppointmentsList');
    if (!list) return;
    list.innerHTML = `<div class="flex items-center justify-center h-full py-8"><span class="spin text-emerald-500 text-2xl">⟳</span></div>`;
    
    try {
        // MOCK INTERNO — hasta tener credenciales OAuth de Setmore
        // Cuando las tengas, reemplazar por:
        // const res = await fetch('/api/setmore-proxy?period=' + currentPeriod);
        // rawAppointments = await res.json();
        
        rawAppointments = generateMockData(currentPeriod);
        await new Promise(r => setTimeout(r, 400)); // Simula latencia
        setmoreInitialized = true;
        
        processAndRenderSetmore(rawAppointments);
        
    } catch (e) {
        console.error("Error al cargar Setmore:", e);
        list.innerHTML = `<p class="text-zinc-500 text-sm text-center py-4">Error cargando datos.</p>`;
    }
}

// ─── PROCESSING & RENDER (Logic Layer) ────────────────────────────────────────
function processAndRenderSetmore(data) {
    let totalIncome = 0;
    let completedCount = 0;
    const servicesCount = {};
    
    data.forEach(apt => {
        if (apt.status !== 'cancelled') {
            totalIncome += apt.cost;
            completedCount++;
            servicesCount[apt.service] = (servicesCount[apt.service] || 0) + 1;
        }
    });
    
    const avgTicket = completedCount > 0 ? (totalIncome / completedCount) : 0;
    
    let topService = '---';
    let max = 0;
    for (const [srv, count] of Object.entries(servicesCount)) {
        if (count > max) { max = count; topService = srv; }
    }

    const elTotal = document.getElementById('smMetricTotal');
    const elCount = document.getElementById('smMetricCount');
    const elAvg = document.getElementById('smMetricAvg');
    const elTop = document.getElementById('smMetricTop');
    
    if (elTotal) elTotal.innerText = `$ ${totalIncome.toLocaleString()}`;
    if (elCount) elCount.innerText = completedCount;
    if (elAvg)   elAvg.innerText   = `$ ${Math.round(avgTicket).toLocaleString()}`;
    if (elTop)   elTop.innerText   = topService;

    renderAppointmentsList(data);
    renderSetmoreChart(data, currentPeriod);
}

function renderAppointmentsList(data) {
    const list = document.getElementById('smAppointmentsList');
    if (!list) return;
    
    if (!data || data.length === 0) {
        list.innerHTML = '<p class="text-zinc-600 text-sm text-center font-bold py-10">No hay turnos para este período.</p>';
        return;
    }

    const sorted = [...data].sort((a,b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = sorted.map(apt => {
        let statusCls = '';
        let statusLabel = '';
        if (apt.status === 'confirmed') {
            statusCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            statusLabel = 'Confirmado';
        } else if (apt.status === 'completed') {
            statusCls = 'bg-zinc-800 text-emerald-400 border-zinc-700';
            statusLabel = 'Completado';
        } else {
            statusCls = 'bg-red-500/10 text-red-500 border-red-500/20';
            statusLabel = 'Cancelado';
        }

        const d = new Date(apt.date);
        const timeStr = d.toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit'});
        const dayStr = d.toLocaleDateString('es', {weekday: 'short', day: '2-digit', month: 'short'});

        return `
            <div class="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/30 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-black border border-zinc-800 rounded-lg flex flex-col items-center justify-center shrink-0">
                        <span class="text-[9px] text-zinc-500 uppercase font-bold">${dayStr.split(' ')[0]}</span>
                        <span class="text-white font-black text-sm leading-none">${timeStr}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-white font-bold text-sm leading-tight truncate">${apt.clientName}</p>
                        <p class="text-zinc-400 text-xs mt-0.5 truncate">${apt.service}</p>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <span class="text-emerald-400 font-mono font-black text-sm">$ ${apt.cost.toLocaleString()}</span>
                    <span class="border px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusCls}">${statusLabel}</span>
                </div>
            </div>
        `;
    }).join('');
}


// ─── GRÁFICOS (Chart.js) ──────────────────────────────────────────────────────
function renderSetmoreChart(data, period) {
    const canvas = document.getElementById('setmoreChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (setmoreChartInstance) {
        setmoreChartInstance.destroy();
        setmoreChartInstance = null;
    }

    const labels = [];
    const values = [];
    const grouped = {};

    if (period === 'day') {
        for (let i = 9; i <= 20; i++) {
            const h = i.toString().padStart(2, '0') + ':00';
            labels.push(h);
            grouped[h] = 0;
        }
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const h = new Date(apt.date).getHours().toString().padStart(2, '0') + ':00';
            if (grouped[h] !== undefined) grouped[h] += apt.cost;
        });
        labels.forEach(l => values.push(grouped[l] || 0));

    } else if (period === 'week') {
        const sortedDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        sortedDays.forEach(d => { grouped[d] = 0; labels.push(d); });
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const d = dayNames[new Date(apt.date).getDay()];
            if (grouped[d] !== undefined) grouped[d] += apt.cost;
        });
        labels.forEach(l => values.push(grouped[l] || 0));

    } else {
        // Mes: agrupar por semanas
        const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        weeks.forEach(w => { grouped[w] = 0; labels.push(w); });
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const day = new Date(apt.date).getDate();
            const weekKey = day <= 7 ? 'Sem 1' : day <= 14 ? 'Sem 2' : day <= 21 ? 'Sem 3' : 'Sem 4';
            grouped[weekKey] += apt.cost;
        });
        labels.forEach(l => values.push(grouped[l] || 0));
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    setmoreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: values,
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointBackgroundColor: '#0c0c0c',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(9,9,11,0.97)',
                    titleColor: '#71717a',
                    bodyColor: '#fff',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: ctx => `$ ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#52525b', font: { family: 'monospace' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#52525b', font: { weight: '700' } }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────
function setmoreChangePeriod(period) {
    currentPeriod = period;
    setmoreInitialized = false; // Forzar recarga
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById('smBtn' + p.charAt(0).toUpperCase() + p.slice(1));
        if (!btn) return;
        if (p === period) {
            btn.classList.add('bg-zinc-800', 'text-white');
            btn.classList.remove('text-zinc-500');
        } else {
            btn.classList.remove('bg-zinc-800', 'text-white');
            btn.classList.add('text-zinc-500');
        }
    });
    loadSetmoreData();
}

// ─── MOCK DATA GENERATOR ──────────────────────────────────────────────────────
function generateMockData(period) {
    const list = [];
    const now = new Date();
    const numApts = period === 'day' ? 7 : period === 'week' ? 38 : 130;
    
    const services = [
        { n: 'Corte Clásico', c: 400 },
        { n: 'Corte + Barba', c: 600 },
        { n: 'Degradado', c: 500 },
        { n: 'Corte + Diseño', c: 550 },
        { n: 'Barba Completa', c: 350 }
    ];
    const names = ['Martín', 'Agustín', 'Lucas', 'Nicolás', 'Facundo', 'Sebastián', 'Elías', 'Joaquín', 'Maximiliano', 'Brian'];

    for (let i = 0; i < numApts; i++) {
        const aptDate = new Date(now);
        
        if (period === 'day') {
            aptDate.setHours(9 + i, 0, 0, 0);
        } else if (period === 'week') {
            const dayOffset = Math.floor(Math.random() * 6); // Lun-Sab
            aptDate.setDate(aptDate.getDate() - aptDate.getDay() + 1 + dayOffset);
            aptDate.setHours(9 + Math.floor(Math.random() * 9), 0, 0, 0);
        } else {
            aptDate.setDate(1 + Math.floor(Math.random() * 27));
            aptDate.setHours(9 + Math.floor(Math.random() * 9), 0, 0, 0);
        }

        const srv = services[Math.floor(Math.random() * services.length)];
        const r = Math.random();
        const status = r > 0.88 ? 'cancelled' : aptDate < now ? 'completed' : 'confirmed';
        
        list.push({
            id: 'sm_' + i,
            clientName: names[Math.floor(Math.random() * names.length)] + ' ' + names[Math.floor(Math.random() * names.length)].charAt(0) + '.',
            service: srv.n,
            cost: srv.c,
            date: aptDate.toISOString(),
            status
        });
    }
    return list;
}
