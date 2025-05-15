document.addEventListener("DOMContentLoaded", () => {
    const btnRentabilidad = document.getElementById("btnRentabilidad");
    if (btnRentabilidad) {
        btnRentabilidad.addEventListener("click", () => {
            mostrarRentabilidad();
        });
    }
});

// Tarjetas de KPI

// Ganancia Neta
async function calcularGananciaNetaTotal() {
    const rutaFacturacion = path.join(__dirname, 'facturacion.json');
    const rutaGastos = path.join(__dirname, 'gastosInternos.json');

    let totalFacturado = 0;
    let totalGastosInternos = 0;

    try {
        // Leer y procesar facturaciones
        const dataFacturacion = JSON.parse(fs.readFileSync(rutaFacturacion, 'utf8'));
        totalFacturado = dataFacturacion
            .filter(f => f.periodo.includes('2025'))  // Filtrar por año 2025
            .reduce((acc, cur) => {
                // Acceder al total dentro de valores
                const valor = parseFloat(cur.valores.total);  // Ahora accedemos a cur.valores.total
                if (isNaN(valor)) {
                    console.warn(`Valor no válido en facturación: ${cur.valores.total}`);
                }
                return acc + (valor || 0);  // Sumar el valor o 0 si no es válido
            }, 0);

        // Leer y procesar gastos internos
        const dataGastos = JSON.parse(fs.readFileSync(rutaGastos, 'utf8'));
        totalGastosInternos = dataGastos
            .filter(g => g.periodo?.includes('2025'))  // Filtrar por año 2025
            .reduce((acc, cur) => {
                // Acceder al total directamente
                const valor = parseFloat(cur.total);  // Acceder a cur.total
                if (isNaN(valor)) {
                    console.warn(`Valor no válido en gastos internos: ${cur.total}`);
                }
                return acc + (valor || 0);  // Sumar el valor o 0 si no es válido
            }, 0);

        // Mostrar valores calculados para depuración
        console.log(`Total Facturado (2025): ${totalFacturado}`);
        console.log(`Total Gastos Internos (2025): ${totalGastosInternos}`);

        // Calcular ganancia neta
        const gananciaNeta = totalFacturado - totalGastosInternos;
        console.log(`Ganancia Neta (2025): ${gananciaNeta}`);
        return gananciaNeta;

    } catch (error) {
        console.error("Error al calcular ganancia neta total:", error);
        return 0;
    }
}

async function mostrarRentabilidad() {
    const existingLink = document.querySelector('link[href="rentab-style.css"]');
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'rentab-style.css';
        document.head.appendChild(link);
    }

    const div3 = document.getElementById('div3');
    div3.innerHTML = `
    <div class="dashboard">
      <div class="tarjetas-kpi">
        <div class="kpi-card" id="kpi-ganancia-neta" title="Suma de todas las ganancias netas hasta la fecha">
          <div class="icono">💰</div>
          <div class="dato" data-valor="0">0</div>
          <div class="titulo">Ganancia total neta</div>
        </div>
        <div class="kpi-card" id="kpi-margen" title="Margen de ganancia respecto a ingresos">
          <div class="icono">📈</div>
          <div class="dato" data-valor="0">0</div>
          <div class="etiqueta">Margen de rentabilidad (%)</div>
        </div>
        <div class="kpi-card" title="Cliente con mayor aporte a la ganancia">
          <div class="icono">👥</div>
          <div class="dato sin-animacion">Cliente A</div>
          <div class="etiqueta">Cliente más rentable</div>
        </div>
        <div class="kpi-card" title="Servicio con mejor rentabilidad">
          <div class="icono">🔧</div>
          <div class="dato" data-valor="1">Servicio X</div>
          <div class="etiqueta">Servicio más rentable</div>
        </div>
      </div>

      <div class="graficos">
        <h3>Distribución de ganancias por clientes</h3>
        <canvas id="graficoPie" width="300" height="300"></canvas>
        <h3>Comparación de ingresos y costos por servicio</h3>
        <canvas id="graficoBarras" width="400" height="300"></canvas>
        <h3>Evolución de rentabilidad por mes</h3>
        <canvas id="graficoLinea" width="400" height="300"></canvas>
      </div>

      <div class="insights">
        <p>📉 Rentabilidad de abril cayó un 12% respecto a marzo.</p>
        <p>📌 Servicio Parque Norte generó solo un 8% del total de ganancias.</p>
      </div>
    </div>

    <div style="text-align: right; margin: 10px;">
      <button id="exportarResumen">📤 Exportar resumen</button>
    </div>
  `;

    animarGraficos();
    generarGraficosEjemplo();

    // 🔽 Actualizar KPIs con datos reales
    const gananciaNeta = await calcularGananciaNetaTotal();
    const margenRentabilidad = await calcularMargenRentabilidad();

    console.log("Ganancia neta calculada:", gananciaNeta);
    console.log("Margen de rentabilidad:", margenRentabilidad);

    const tarjetaGanancia = document.querySelector("#kpi-ganancia-neta .dato[data-valor]");
    if (tarjetaGanancia) {
        tarjetaGanancia.setAttribute("data-valor", gananciaNeta);
        tarjetaGanancia.textContent = "0";
    } else {
        console.warn("No se encontró la tarjeta de ganancia neta");
    }

    const tarjetaMargen = document.querySelector("#kpi-margen .dato[data-valor]");
    if (tarjetaMargen) {
        tarjetaMargen.setAttribute("data-valor", margenRentabilidad);
        tarjetaMargen.textContent = "0";
    } else {
        console.warn("No se encontró la tarjeta de margen de rentabilidad");
    }

    // 🟢 Solo una llamada después de actualizar los datos
    animarDatosNumericos();
}


function animarDatosNumericos() {
    document.querySelectorAll(".dato").forEach(el => {
        const valorFinal = +el.dataset.valor;
        if (isNaN(valorFinal)) return;

        let actual = 0;
        const velocidad = valorFinal / 60;

        // Identifica por ID si el valor es un porcentaje
        const esPorcentaje = el.closest("#kpi-margen") !== null;

        const intervalo = setInterval(() => {
            actual += velocidad;
            if (actual >= valorFinal) {
                actual = valorFinal;
                clearInterval(intervalo);
            }

            el.textContent = esPorcentaje
                ? `${Math.round(actual)}%`
                : `$${Math.round(actual).toLocaleString()}`;
        }, 20);
    });
}


function animarGraficos() {
    document.querySelectorAll("canvas").forEach(canvas => {
        canvas.style.opacity = 0;
        canvas.style.transform = "scale(0.9)";
        setTimeout(() => {
            canvas.style.transition = "all 0.8s ease";
            canvas.style.opacity = 1;
            canvas.style.transform = "scale(1)";
        }, 100);
    });
}

function generarGraficosEjemplo() {
    if (typeof Chart === 'undefined') return;

    // Pie Chart
    new Chart(document.getElementById('graficoPie'), {
        type: 'pie',
        data: {
            labels: ['Cliente A', 'Cliente B', 'Cliente C'],
            datasets: [{
                data: [45, 30, 25],
                backgroundColor: ['#4caf50', '#2196f3', '#ff9800']
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                }
            }
        }
    });

    // Bar Chart
    new Chart(document.getElementById('graficoBarras'), {
        type: 'bar',
        data: {
            labels: ['Servicio A', 'Servicio B', 'Servicio C'],
            datasets: [
                {
                    label: 'Ingresos',
                    data: [500000, 300000, 150000],
                    backgroundColor: '#4caf50'
                },
                {
                    label: 'Costos',
                    data: [300000, 220000, 120000],
                    backgroundColor: '#f44336'
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                }
            }
        }
    });

    // Line Chart
    new Chart(document.getElementById('graficoLinea'), {
        type: 'line',
        data: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril'],
            datasets: [{
                label: 'Ganancia mensual',
                data: [100000, 150000, 120000, 80000],
                fill: true,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33,150,243,0.2)'
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 14
                        },
                        color: '#000'
                    }
                }
            }
        }
    });
}

window.mostrarRentabilidad = mostrarRentabilidad;

// Margen % de rentabilidad
async function calcularMargenRentabilidad() {
    const rutaFacturacion = path.join(__dirname, 'facturacion.json');
    const rutaGastos = path.join(__dirname, 'gastosInternos.json');

    let totalFacturado = 0;
    let totalGastosInternos = 0;

    try {
        const dataFacturacion = JSON.parse(fs.readFileSync(rutaFacturacion, 'utf8'));
        totalFacturado = dataFacturacion
            .filter(f => f.periodo.includes('2025'))
            .reduce((acc, cur) => acc + (parseFloat(cur.valores?.total) || 0), 0);

        const dataGastos = JSON.parse(fs.readFileSync(rutaGastos, 'utf8'));
        totalGastosInternos = dataGastos
            .filter(g => g.periodo?.includes('2025'))
            .reduce((acc, cur) => acc + (parseFloat(cur.total) || 0), 0);

        const gananciaNeta = totalFacturado - totalGastosInternos;

        if (totalFacturado === 0) return 0;

        const margen = (gananciaNeta / totalFacturado) * 100;
        return margen.toFixed(2); // Devolvemos con 2 decimales
    } catch (error) {
        console.error("Error al calcular margen de rentabilidad:", error);
        return 0;
    }
}

