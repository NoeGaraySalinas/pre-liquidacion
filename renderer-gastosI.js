

// Rutas de archivos
const rutaServicios = path.join(__dirname, 'servicios.json');
const filePathGI = path.join(__dirname, 'gastosInternos.json');

// Verificación de dependencias al inicio
if (!fs || !path) {
    console.error('Error: Faltan dependencias requeridas (fs o path)');
    throw new Error('Dependencias requeridas no disponibles');
}

// Verificación de rutas
if (!__dirname) {
    console.error('Error: __dirname no está definido');
    throw new Error('__dirname no disponible');
}

// Variables globales
let listaServiciosGI = [];

// Función para formatear moneda
function formatPesos(valor) {
    return valor.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'
    });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    initGastosInternos();
    cargarServiciosGI();
    setupGlobalEventListeners();
});

// Función principal de inicialización
function initGastosInternos() {
    const MAX_INTENTOS = 5;
    let intentos = 0;

    function intentarInicializar() {
        const btnGastosInternos = document.getElementById('btnGastosInternos');

        if (btnGastosInternos) {
            btnGastosInternos.addEventListener('click', function () {
                console.log("Click en botón Gastos Internos detectado");
                try {
                    loadGastosInternosForm();
                    console.log("loadGastosInternosForm ejecutado");
                } catch (e) {
                    console.error('Error al cargar formulario de gastos internos:', e);
                    alert('Error al cargar el formulario');
                }
            });
            console.log('Botón de Gastos Internos inicializado correctamente');
        } else if (intentos < MAX_INTENTOS) {
            intentos++;
            setTimeout(intentarInicializar, 300 * intentos);
        } else {
            console.error('Botón btnGastosInternos no encontrado después de varios intentos');
        }
    }

    intentarInicializar();
}


// Configurar listeners globales
function setupGlobalEventListeners() {
    document.addEventListener("click", (e) => {
        const sugerenciasDivGI = document.getElementById("sugerenciasServicioGI");
        const inputServicioGI = document.getElementById("inputServicioGI");

        if (sugerenciasDivGI && inputServicioGI &&
            !sugerenciasDivGI.contains(e.target) &&
            e.target !== inputServicioGI) {
            sugerenciasDivGI.innerHTML = "";
        }
    });
}

// Función para cargar servicios
function cargarServiciosGI() {
    if (!fs.existsSync(rutaServicios)) {
        console.warn('Archivo servicios.json no encontrado. Creando uno nuevo...');
        try {
            fs.writeFileSync(rutaServicios, '[]');
            listaServiciosGI = [];
            console.log('Archivo servicios.json creado exitosamente');
        } catch (error) {
            console.error('Error al crear servicios.json:', error);
        }
        return;
    }

    fs.readFile(rutaServicios, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer servicios.json:', err);
            return;
        }
        try {
            listaServiciosGI = JSON.parse(data);
            console.log(`${listaServiciosGI.length} servicios cargados correctamente`);
        } catch (error) {
            console.error('Error al parsear servicios.json:', error);
        }
    });
}

// Inicialización segura de elementos globales
function safeInit() {
    try {
        console.log('Inicialización general completada (sin cargar módulos específicos)');
    } catch (error) {
        console.error('Error en la inicialización general:', error);
    }
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
} else {
    safeInit();
}

// Filtrar servicios para autocompletado
function filtrarServiciosGI(termino) {
    if (!listaServiciosGI || !Array.isArray(listaServiciosGI)) return [];

    return listaServiciosGI
        .filter(s => s.nombre && s.nombre.toLowerCase().includes(termino.toLowerCase()))
        .map(s => s.nombre);
}

// Mostrar sugerencias de servicios
function mostrarSugerenciasServicioGI(sugerencias) {
    const contenedor = document.getElementById('sugerenciasServicioGI');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    if (sugerencias.length === 0) return;

    sugerencias.forEach(servicio => {
        const div = document.createElement('div');
        div.textContent = servicio;
        div.classList.add('sugerencia-item');
        div.addEventListener('click', () => {
            const inputServicio = document.getElementById('inputServicioGI');
            if (inputServicio) {
                inputServicio.value = servicio;
                contenedor.innerHTML = '';
            }
        });
        contenedor.appendChild(div);
    });
}

// Cargar formulario de gastos internos
function loadGastosInternosForm() {
    const div3 = document.getElementById('div3');
    if (!div3) {
        console.error('Contenedor div3 no encontrado');
        return;
    }

    div3.innerHTML = `
        <h2>Gastos Internos</h2>
    
        <!-- Filtros -->
        <div class="filters">
            <input type="month" id="filterMonthGastosI">
            <button id="applyFiltersGastosI" class="btn-filter">Filtrar</button>
        </div>
        <button id="nuevoGastoInternoBtn" class="btn-primary">+ Nuevo Gasto Interno</button>

        <!-- FORMULARIO -->
        <form id="gastoInternoForm" style="display:none;">
            <div class="form-section">
                <h3>Datos Básicos</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inputPeriodoGI">Período (Mes)*</label>
                        <input type="month" id="inputPeriodoGI" required>
                    </div>
        
                    <div class="form-group">
                        <label for="inputSectorGI">Sector*</label>
                        <select id="inputSectorGI" required>
                            <option value="SAS">SAS</option>
                            <option value="Oficina Córdoba">Oficina Córdoba</option>
                            <option value="Oficina VCP">Oficina VCP</option>
                        </select>
                    </div>
        
                    <div class="form-group">
                        <label for="inputServicioGI">Servicio*</label>
                        <input type="text" id="inputServicioGI" required autocomplete="off">
                        <div id="sugerenciasServicioGI" class="sugerencias"></div>
                    </div>
                </div>
            </div>
            
            <div class="form-section">
                <h3>Horas y Costos</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inputHsTrabajadasGI">Horas Trabajadas*</label>
                        <input type="number" id="inputHsTrabajadasGI" min="0" step="any" required>
                    </div>
        
                    <div class="form-group">
                        <label for="inputHsLiquidadasGI">Horas Liquidadas*</label>
                        <input type="number" id="inputHsLiquidadasGI" min="0" step="any" required>
                    </div>
        
                    <div class="form-group">
                        <label for="inputValorHoraGI">Valor Hora ($)*</label>
                        <input type="text" id="inputValorHoraGI" required>
                    </div>
        
                    <div class="form-group">
                        <label for="inputAumentoGI">Aumento (%)</label>
                        <input type="number" id="inputAumentoGI" min="0" max="100" step="0.01" value="0">
                    </div>
                </div>
            </div>
        
            <div class="form-section">
                <h3>Totales</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inputNetoGI">Neto ($)</label>
                        <input type="text" id="inputNetoGI" readonly>
                    </div>
        
                    <div class="form-group">
                        <label for="inputTotalGI">Total ($)</label>
                        <input type="text" id="inputTotalGI" readonly>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary">Guardar Gasto</button>
                    <button type="button" id="cancelarGastoGI" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        </form>
        

        <!-- Tabla resumen -->
        <table id="gastosInternosTable" class="styled-table">
    <thead>
        <tr>
            <th>Período</th>
            <th>Sector</th>
            <th>Servicio</th>
            <th>Hs. trabajadas</th>
            <th>Hs. liquidadas</th>
            <th>Valor hora</th>
            <th>Aumento</th>
            <th>Neto</th>
            <th>Total</th>
            <th>Acciones</th>
        </tr>
    </thead>
    <tbody id="gastosInternosTableBody"></tbody>
</table>

    `;

    // Configurar eventos del formulario
    setupFormEvents();
    renderGastosInternos();
}

// Configurar eventos del formulario
function setupFormEvents() {
    // Mostrar/ocultar formulario
    const nuevoGastoBtn = document.getElementById('nuevoGastoInternoBtn');
    if (nuevoGastoBtn) {
        nuevoGastoBtn.addEventListener('click', () => {
            const form = document.getElementById('gastoInternoForm');
            if (form) form.style.display = 'block';
        });
    }

    // Enviar formulario
    const form = document.getElementById('gastoInternoForm');
    if (form) {
        form.addEventListener('submit', guardarGastoInterno);
    }

    // Cancelar formulario
    const cancelarBtn = document.getElementById('cancelarGastoGI');
    if (cancelarBtn) {
        cancelarBtn.addEventListener('click', () => {
            const form = document.getElementById('gastoInternoForm');
            if (form) {
                form.reset();
                form.style.display = 'none';
            }
        });
    }

    // Formatear valor hora (comas por puntos)
    const inputValorHora = document.getElementById('inputValorHoraGI');
    if (inputValorHora) {
        inputValorHora.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(',', '.');
        });
    }

    // Autocompletado de servicios
    const inputServicio = document.getElementById('inputServicioGI');
    if (inputServicio) {
        inputServicio.addEventListener('input', (e) => {
            const termino = e.target.value;
            const sugerenciasContenedor = document.getElementById('sugerenciasServicioGI');

            if (!sugerenciasContenedor) return;

            sugerenciasContenedor.innerHTML = '';
            if (termino.length === 0) return;

            const sugerencias = filtrarServiciosGI(termino);
            mostrarSugerenciasServicioGI(sugerencias);
        });
    }

    // Cálculo automático de neto y total
    const inputsToWatch = ['inputHsLiquidadasGI', 'inputValorHoraGI', 'inputAumentoGI'];
    inputsToWatch.forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calcularGastoInterno);
        }
    });
}

// Calcular valores del gasto interno
function calcularGastoInterno() {
    const hs = parseFloat(document.getElementById('inputHsLiquidadasGI')?.value) || 0;
    const valorHoraInput = document.getElementById('inputValorHoraGI');
    const aumento = parseFloat(document.getElementById('inputAumentoGI')?.value) || 0;

    let valorHora = 0;
    if (valorHoraInput) {
        valorHora = parseFloat(valorHoraInput.value.replace(',', '.')) || 0;
    }

    const valorHoraConAumento = valorHora * (1 + aumento / 100);
    const neto = valorHoraConAumento * hs;

    const inputNeto = document.getElementById('inputNetoGI');
    const inputTotal = document.getElementById('inputTotalGI');

    if (inputNeto) inputNeto.value = neto.toFixed(2);
    if (inputTotal) inputTotal.value = neto.toFixed(2);
}

// Guardar gasto interno
function guardarGastoInterno(e) {
    e.preventDefault();

    // Obtener datos del formulario
    const periodo = document.getElementById('inputPeriodoGI')?.value;
    const sector = document.getElementById('inputSectorGI')?.value;
    const servicio = document.getElementById('inputServicioGI')?.value;
    const hsTrabajadas = parseFloat(document.getElementById('inputHsTrabajadasGI')?.value) || 0;
    const hsLiquidadas = parseFloat(document.getElementById('inputHsLiquidadasGI')?.value) || 0;
    const valorHoraInput = document.getElementById('inputValorHoraGI')?.value || '0';
    const aumento = parseFloat(document.getElementById('inputAumentoGI')?.value) || 0;
    const neto = parseFloat(document.getElementById('inputNetoGI')?.value) || 0;
    const total = parseFloat(document.getElementById('inputTotalGI')?.value) || 0;

    // Validación
    if (!periodo || !sector || !servicio) {
        alert('Por favor complete todos los campos obligatorios');
        return;
    }

    // Crear objeto gasto temporal
    const gasto = {
        id: generarIDGasto(),
        periodo,
        sector,
        servicio,
        hsTrabajadas,
        hsLiquidadas,
        valorHora: parseFloat(valorHoraInput.replace(',', '.')),
        aumento,
        neto,
        total
    };

    // Leer archivo
    let gastos = [];
    if (fs.existsSync(filePathGI)) {
        try {
            gastos = JSON.parse(fs.readFileSync(filePathGI, 'utf8'));
        } catch (error) {
            console.error('Error al leer gastosInternos.json:', error);
        }
    }

    // Obtener referencia del formulario
    const form = document.getElementById('gastoInternoForm');
    const idEditar = form?.dataset?.editing || null;

    // ---------------------------
    // 🔥 MODO EDICIÓN
    // ---------------------------
    if (idEditar) {
        const index = gastos.findIndex(g => g.id === idEditar);

        if (index !== -1) {
            // Mantener el ID original
            gastos[index] = { ...gasto, id: idEditar };
        }

        // Guardar archivo
        fs.writeFileSync(filePathGI, JSON.stringify(gastos, null, 2));

        alert("Gasto actualizado correctamente");

        // Limpiar estado edición
        delete form.dataset.editing;
        form.reset();
        form.style.display = "none";

        renderGastosInternos();
        return;
    }

    // ---------------------------
    // 🔥 NUEVO REGISTRO (NO EDICIÓN)
    // ---------------------------

    // Validar duplicados SOLO en creación
    const yaExiste = gastos.some(g =>
        g.periodo === gasto.periodo &&
        g.sector === gasto.sector &&
        g.servicio === gasto.servicio
    );

    if (yaExiste) {
        alert('Ya existe un gasto para este servicio en ese periodo y sector.');
        return;
    }

    // Guardar nuevo gasto
    gastos.push(gasto);

    try {
        fs.writeFileSync(filePathGI, JSON.stringify(gastos, null, 2));
        alert('Gasto guardado con éxito.');
        renderGastosInternos();

        form.reset();
        form.style.display = 'none';

    } catch (error) {
        console.error('Error al guardar el gasto:', error);
        alert('Error al guardar el gasto');
    }
}


// Generar ID único para el gasto
function generarIDGasto() {
    const periodo = document.getElementById('inputPeriodoGI')?.value || '';
    const sector = document.getElementById('inputSectorGI')?.value || '';
    const servicio = document.getElementById('inputServicioGI')?.value || '';

    return `${periodo}_${sector}_${servicio}`
        .replace(/\s+/g, '_')
        .toLowerCase();
}

// Mostrar gastos en tabla
function renderGastosInternos() {
    const tbody = document.getElementById('gastosInternosTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!fs.existsSync(filePathGI)) return;

    try {
        const gastos = JSON.parse(fs.readFileSync(filePathGI, 'utf8'));

        gastos.forEach((g) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${g.periodo}</td>
                <td>${g.sector}</td>
                <td>${g.servicio}</td>
                <td>${g.hsTrabajadas}</td>
                <td>${g.hsLiquidadas}</td>
                <td>${formatPesos(g.valorHora)}</td>
                <td>${g.aumento}%</td>
                <td>${formatPesos(g.neto)}</td>
                <td>${formatPesos(g.total)}</td>
                <td>
                 <button class="btn-secondary" onclick="editarGastoInterno('${g.id}')">Editar</button>
                <button class="btn-danger" onclick="eliminarGastoInterno('${g.id}')">Eliminar</button>
                </td>

            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al renderizar gastos internos:', error);
    }
}

function filtrarGastosInternosPorMes() {
    const mes = document.getElementById("filterMonthGastosI")?.value;
    const tbody = document.getElementById('gastosInternosTableBody');

    if (!mes) {
        renderGastosInternos();
        return;
    }

    const gastos = JSON.parse(fs.readFileSync(filePathGI, 'utf8'));

    const filtrados = gastos.filter(g => g.periodo === mes);

    tbody.innerHTML = '';

    filtrados.forEach((g) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${g.periodo}</td>
            <td>${g.sector}</td>
            <td>${g.servicio}</td>
            <td>${g.hsTrabajadas}</td>
            <td>${g.hsLiquidadas}</td>
            <td>${formatPesos(g.valorHora)}</td>
            <td>${g.aumento}%</td>
            <td>${formatPesos(g.neto)}</td>
            <td>${formatPesos(g.total)}</td>
            <td>
                <button class="btn-secondary" onclick="editarGastoInterno('${g.id}')">Editar</button>
                <button class="btn-danger" onclick="eliminarGastoInterno('${g.id}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

document.addEventListener("click", (e) => {
    if (e.target.id === "applyFiltersGastosI") {
        filtrarGastosInternosPorMes();
    }
});


function editarGastoInterno(id) {
    if (!fs.existsSync(filePathGI)) return;

    const gastos = JSON.parse(fs.readFileSync(filePathGI, 'utf8'));
    const gasto = gastos.find(g => g.id === id);

    if (!gasto) {
        alert("No se encontró el gasto interno.");
        return;
    }

    // Mostrar formulario y cargar datos
    const form = document.getElementById('gastoInternoForm');
    form.style.display = 'block';

    document.getElementById('inputPeriodoGI').value = gasto.periodo;
    document.getElementById('inputSectorGI').value = gasto.sector;
    document.getElementById('inputServicioGI').value = gasto.servicio;
    document.getElementById('inputHsTrabajadasGI').value = gasto.hsTrabajadas;
    document.getElementById('inputHsLiquidadasGI').value = gasto.hsLiquidadas;
    document.getElementById('inputValorHoraGI').value = gasto.valorHora;
    document.getElementById('inputAumentoGI').value = gasto.aumento;
    document.getElementById('inputNetoGI').value = gasto.neto;
    document.getElementById('inputTotalGI').value = gasto.total;
    

    form.dataset.editing = id;
}

// Eliminar gasto interno
function eliminarGastoInterno(id) {
    if (!id || !confirm('¿Estás segura de que querés eliminar este gasto?')) return;

    if (!fs.existsSync(filePathGI)) return;

    try {
        let gastos = JSON.parse(fs.readFileSync(filePathGI, 'utf8'));
        gastos = gastos.filter(g => g.id !== id);
        fs.writeFileSync(filePathGI, JSON.stringify(gastos, null, 2));
        renderGastosInternos();
    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        alert('Error al eliminar el gasto');
    }
}