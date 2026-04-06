// ─── SETMORE MODO BARBERÍA (DASHBOARD) ───────────────────────────────────────
// Estado: PENDIENTE DE INTEGRACIÓN CON API REAL DE SETMORE.
// Los datos mostrados son cero hasta conectar credenciales OAuth.

let setmoreChartInstance = null;
let currentPeriod = 'day';
let setmoreInitialized = false;

// ─── INIT ────────────────────────────────────────────────────────────────────
function initSetmoreModule() {
    if (setmoreInitialized) return;
    setmoreInitialized = true;
    renderEmptyDashboard();
    renderSetmoreChart([], currentPeriod);
}

// ─── RENDER VACÍO (estado "no conectado") ──────────────────────────────────────
function renderEmptyDashboard() {
    const elTotal = document.getElementById('smMetricTotal');
    const elCount = document.getElementById('smMetricCount');
    const elAvg   = document.getElementById('smMetricAvg');
    const elTop   = document.getElementById('smMetricTop');
    if (elTotal) elTotal.innerText = '$ 0';
    if (elCount) elCount.innerText = '0';
    if (elAvg)   elAvg.innerText   = '$ 0';
    if (elTop)   elTop.innerText   = '—';

    const list = document.getElementById('smAppointmentsList');
    if (list) list.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <svg class="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>
            <div>
                <p class="text-zinc-400 font-bold text-sm">Sin conexión a Setmore</p>
                <p class="text-zinc-600 text-xs mt-1 max-w-[200px]">Conectá tu cuenta cuando tengas las credenciales OAuth de Setmore.</p>
            </div>
            <a href="mailto:api@setmore.com" class="text-emerald-500 hover:text-emerald-400 text-xs font-bold transition-colors">
                Solicitar acceso a API →
            </a>
        </div>
    `;
}

// ─── FUNCIÓN DE CARGA (para cuando se conecte la API real) ────────────────────
async function loadSetmoreData() {
    // CUANDO TENGAS LAS CREDENCIALES:
    // 1. Configurar SETMORE_CLIENT_ID y SETMORE_CLIENT_SECRET en Netlify Variables
    // 2. Crear netlify/edge-functions/setmore-proxy.js
    // 3. Descomentar el bloque de abajo:
    //
    // const res = await fetch('/api/setmore-proxy?period=' + currentPeriod);
    // const data = await res.json();
    // processAndRenderSetmore(data);

    renderEmptyDashboard();
    renderSetmoreChart([], currentPeriod);
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────
function setmoreChangePeriod(period) {
    currentPeriod = period;
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
    renderSetmoreChart([], currentPeriod);
}

// ─── GRÁFICO VACÍO ────────────────────────────────────────────────────────────
function renderSetmoreChart(data, period) {
    const canvas = document.getElementById('setmoreChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (setmoreChartInstance) {
        setmoreChartInstance.destroy();
        setmoreChartInstance = null;
    }

    let labels = [];
    if (period === 'day') {
        for (let i = 9; i <= 20; i++) labels.push(i.toString().padStart(2,'0') + ':00');
    } else if (period === 'week') {
        labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    } else {
        labels = ['Sem 1','Sem 2','Sem 3','Sem 4'];
    }
    const values = labels.map(() => 0);

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    setmoreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: values,
                borderColor: '#27272a',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#18181b',
                pointBorderColor: '#3f3f46',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#3f3f46', font: { family: 'monospace' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#3f3f46', font: { weight: '700' } }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}
