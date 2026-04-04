// ─── SETMORE MODO BARBERÍA (DASHBOARD) ──────────────────────────────────────────
// Fetch y visualización de reservas e ingresos desde API de Setmore proxy o Mock.

let setmoreChartInstance = null;
let currentPeriod = 'day'; // day, week, month
let rawAppointments = [];

// Event listener para inicializar si la sección se abre
function initSetmoreModule() {
    if (document.getElementById('sectionSetmore').classList.contains('hidden')) return;
    loadSetmoreData();
}

// Interceptar cambios de sección en el nav principal
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionId) {
    if (originalSwitchSection) originalSwitchSection(sectionId);
    if (sectionId === 'setmore') {
        initSetmoreModule();
    }
}

// ─── FETCH & MOCK (Data Layer) ────────────────────────────────────────────────
async function loadSetmoreData() {
    const list = document.getElementById('smAppointmentsList');
    list.innerHTML = `<div class="flex items-center justify-center h-full"><span class="spin text-emerald-500 text-2xl">⟳</span></div>`;
    
    try {
        // En un futuro esto llamará a /api/setmore-proxy
        // const res = await fetch('/api/setmore-proxy?period=' + currentPeriod);
        // rawAppointments = await res.json();
        
        // MOCK INTERNO DE ESPERA HASTA TENER LA API OAUTH KEY
        rawAppointments = generateMockData(currentPeriod);
        
        await new Promise(r => setTimeout(r, 600)); // Simulate net latency
        
        processAndRenderSetmore(rawAppointments);
        showToast('✓ Datos de agenda actualizados', 'success');
        
    } catch (e) {
        console.error("Error al cargar Setmore:", e);
        showToast('✗ Error al conectar con Setmore', 'error');
        list.innerHTML = `<p class="text-zinc-500 text-sm text-center py-4">Falla de conexión con Setmore.</p>`;
    }
}

// ─── PROCESSING & RENDER (Logic Layer) ────────────────────────────────────────
function processAndRenderSetmore(data) {
    // 1. Calcular métricas principales
    let totalIncome = 0;
    let completedCount = 0;
    const servicesCount = {};
    
    data.forEach(apt => {
        if (apt.status !== 'cancelled' && apt.status !== 'no-show') {
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

    // Actualizar tarjetas de métricas
    document.getElementById('smMetricTotal').innerText = `$ ${totalIncome.toLocaleString()}`;
    document.getElementById('smMetricCount').innerText = completedCount;
    document.getElementById('smMetricAvg').innerText = `$ ${Math.round(avgTicket).toLocaleString()}`;
    document.getElementById('smMetricTop').innerText = topService;

    // 2. Renderizar lista de turnos
    renderAppointmentsList(data);
    
    // 3. Renderizar Gráfico
    renderSetmoreChart(data, currentPeriod);
}

function renderAppointmentsList(data) {
    const list = document.getElementById('smAppointmentsList');
    if (!data || data.length === 0) {
        list.innerHTML = '<p class="text-zinc-600 text-sm text-center font-bold py-10">No hay turnos para este período.</p>';
        return;
    }

    // Ordernar por fecha / hora
    data.sort((a,b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = data.map(apt => {
        let statusBadge = `<span class="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">Confirmado</span>`;
        if (apt.status === 'completed') statusBadge = `<span class="bg-zinc-800 text-emerald-400 border border-zinc-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">Completado</span>`;
        if (apt.status === 'cancelled') statusBadge = `<span class="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">Cancelado</span>`;

        const d = new Date(apt.date);
        const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateStr = d.toLocaleDateString([], {weekday: 'short', day: '2-digit', month: 'short'});

        return `
            <div class="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/30 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-black border border-zinc-800 rounded-lg flex flex-col items-center justify-center shrink-0">
                        <span class="text-[9px] text-zinc-500 uppercase font-bold">${dateStr.split(' ')[0]}</span>
                        <span class="text-white font-black text-sm">${timeStr}</span>
                    </div>
                    <div>
                        <p class="text-white font-bold text-sm leading-tight">${apt.clientName}</p>
                        <p class="text-zinc-400 text-xs mt-0.5">${apt.service}</p>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1.5 shrink-0">
                    <span class="text-emerald-400 font-mono font-black text-sm">$ ${apt.cost.toLocaleString()}</span>
                    ${statusBadge}
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
    }

    // Agrupar datos según período
    const grouped = {};
    const labels = [];
    const values = [];

    if (period === 'day') {
        // Por horas del día actua (ej 10:00, 11:00...)
        const today = new Date();
        for(let i=9; i<=20; i++) {
            const h = i.toString().padStart(2, '0') + ':00';
            labels.push(h);
            grouped[h] = 0;
        }
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const h = new Date(apt.date).getHours().toString().padStart(2, '0') + ':00';
            if (grouped[h] !== undefined) grouped[h] += apt.cost;
        });
        labels.forEach(l => values.push(grouped[l]));

    } else if (period === 'week') {
        // Lunes a Domingo
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(d => grouped[d] = 0);
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const d = days[new Date(apt.date).getDay()];
            grouped[d] += apt.cost;
        });
        // Reordenar a Lun -> Dom
        const sortedDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        sortedDays.forEach(d => { labels.push(d); values.push(grouped[d]); });
        
    } else if (period === 'month') {
        // Por semanas del mes o días (simplificado a cortes de 5 días)
        for(let i=1; i<=30; i+=3) {
            labels.push(`Día ${i}`);
            grouped[`Día ${i}`] = 0;
        }
        data.forEach(apt => {
            if (apt.status === 'cancelled') return;
            const day = new Date(apt.date).getDate();
            const groupKey = `Día ${day - (day%3) + 1}`;
            if(grouped[groupKey] !== undefined) grouped[groupKey] += apt.cost;
        });
        labels.forEach(l => values.push(grouped[l]));
    }

    // Config custom de gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); // emerald-500
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    setmoreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: values,
                borderColor: '#10b981', // emerald-500
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#0c0c0c',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
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
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: '#a1a1aa',
                    bodyColor: '#fff',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(ctx) { return '$ ' + ctx.raw.toLocaleString(); }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#71717a', font: { family: 'ui-monospace, monospace' } }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#71717a', font: { weight: 'bold' } }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────
function setmoreChangePeriod(period) {
    currentPeriod = period;
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById('smBtn' + p.charAt(0).toUpperCase() + p.slice(1));
        if (btn) {
            if (p === period) {
                btn.classList.remove('text-zinc-500');
                btn.classList.add('bg-zinc-800', 'text-white');
            } else {
                btn.classList.add('text-zinc-500');
                btn.classList.remove('bg-zinc-800', 'text-white');
            }
        }
    });
    loadSetmoreData();
}

// ─── MOCK DATA GENERATOR (Temporary) ──────────────────────────────────────────
function generateMockData(period) {
    const list = [];
    const now = new Date();
    let numApts = period === 'day' ? 6 : period === 'week' ? 35 : 120;
    
    const services = [
        { n: 'Corte Clásico', c: 400 },
        { n: 'Corte + Barba', c: 600 },
        { n: 'Diseño/Degradado', c: 500 },
        { n: 'Corte + Mechas', c: 900 }
    ];
    const names = ['Martín', 'Agustín', 'Lucas', 'Nico', 'Facundo', 'Seba', 'Elías', 'Joaquín', 'Maxi', 'Brian'];

    for (let i = 0; i < numApts; i++) {
        let aptDate = new Date(now);
        if (period === 'day') {
            aptDate.setHours(9 + Math.floor(Math.random() * 10), 0, 0); // 9am to 7pm
        } else if (period === 'week') {
            aptDate.setDate(aptDate.getDate() - aptDate.getDay() + 1 + Math.floor(Math.random() * 6)); // Lun to Sab
            aptDate.setHours(9 + Math.floor(Math.random() * 9), 0, 0);
        } else {
            aptDate.setDate(1 + Math.floor(Math.random() * 28)); // 1 to 28
            aptDate.setHours(9 + Math.floor(Math.random() * 9), 0, 0);
        }

        const srv = services[Math.floor(Math.random() * services.length)];
        const isCancelled = Math.random() > 0.9;
        
        list.push({
            id: 'sm_' + Math.floor(Math.random() * 10000),
            clientName: names[Math.floor(Math.random() * names.length)] + ' ' + names[Math.floor(Math.random() * names.length)].charAt(0) + '.',
            service: srv.n,
            cost: srv.c,
            date: aptDate.toISOString(),
            status: isCancelled ? 'cancelled' : (aptDate < now ? 'completed' : 'confirmed')
        });
    }

    return list;
}
