// renderer-reportes.js
if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}

let clientes = [];
let servicios = [];
let facturacionesActuales = [];
let filtrosAplicados = {};
const XLSX = require('xlsx');

console.log("renderer.js cargado correctamente");

// Inicializar los eventos del DOM cuando esté listo
document.addEventListener("DOMContentLoaded", () => {
  initializeGestionServiciosBtn();
  initializeGestionClientesBtn();
  initializeFacturantesBtn();
  setupFacturacionListeners();
  initializeReporteGeneralBtn();
});

// Inicializar el botón "Gestionar Clientes"
function initializeGestionClientesBtn() {
  const btn = document.getElementById("gestionarClientesBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      console.log("Botón 'Gestionar Clientes' presionado.");
      loadClientesTable();
    });
  }
}

// Función para inicializar el botón de reporte general
function initializeReporteGeneralBtn() {
  const botonReporte = document.getElementById("reporteGeneral");
  if (botonReporte) {
    botonReporte.addEventListener("click", () => {
      console.log("Botón 'Generar Reporte' presionado");
      if (!document.getElementById("div3")) {
        console.error("Contenedor div3 no encontrado");
        return;
      }
      loadReporteGeneral();
    });
  } else {
    console.warn("El botón #reporteGeneral no se encontró en el DOM.");
  }
}

async function cargarServicios() {
  try {
    servicios = await ipcRenderer.invoke('get-servicios');
    console.log("Servicios cargados:", servicios.length);
  } catch (error) {
    console.error("Error cargando servicios:", error);
    servicios = [];
  }
}

// Función mejorada para cargar datos de autocompletado
async function cargarDatosAutocompletado() {
  try {
    const [clientes, servicios, facturantes] = await Promise.all([
      ipcRenderer.invoke('get-clientes-autocomplete'),
      ipcRenderer.invoke('get-servicios-autocomplete'),
      ipcRenderer.invoke('get-facturantes-autocomplete')
    ]);

    return {
      clientes: Array.isArray(clientes) ? clientes : [],
      servicios: Array.isArray(servicios) ? servicios : [],
      facturantes: Array.isArray(facturantes) ? facturantes : []
    };
  } catch (error) {
    console.error('Error cargando datos para autocompletado:', error);
    return { clientes: [], servicios: [], facturantes: [] };
  }
}

// Función para configurar datalist
function configurarDatalist(inputId, datalistId, datos) {
  const input = document.getElementById(inputId);
  const datalist = document.getElementById(datalistId);

  if (!input || !datalist) {
    console.error(`Elementos no encontrados para ${inputId}`);
    return false;
  }

  datalist.innerHTML = '';

  if (datos && datos.length > 0) {
    datos.forEach(item => {
      const option = document.createElement('option');
      option.value = item.nombre || item;
      datalist.appendChild(option);
    });
    return true;
  }
  return false;
}

// Función para configurar autocompletado en reportes
async function configurarAutocompletadoReportes() {
  try {
    const { clientes, servicios, facturantes } = await cargarDatosAutocompletado();

    const resultados = [
      configurarDatalist('filtroCliente', 'clientesListReporte', clientes),
      configurarDatalist('filtroServicio', 'serviciosListReporte', servicios),
      configurarDatalist('filtroFacturante', 'facturantesListReporte', facturantes)
    ];

    return resultados.every(Boolean);
  } catch (error) {
    console.error('Error configurando autocompletado para reportes:', error);
    return false;
  }
}

// Función principal para cargar reportes
function loadReporteGeneral() {
  const div3 = document.getElementById("div3");
  if (!div3) {
    console.error("Contenedor principal no encontrado");
    return;
  }

  // Limpiar el contenedor primero
  div3.innerHTML = "";

  div3.innerHTML = `
    <h2>Generar Reporte General</h2>
    <div id="reportes-container" style="padding: 20px; font-family: sans-serif;">
      <form id="filtroReporte" class="filtro-reporte-form">
        <div class="form-row">
          <div class="form-group">
            <label for="filtroCliente">Cliente:</label>
            <input type="text" id="filtroCliente" list="clientesListReporte" autocomplete="off" placeholder="Buscar cliente...">
            <datalist id="clientesListReporte"></datalist>
          </div>
          <div class="form-group">
            <label for="filtroServicio">Servicio:</label>
            <input type="text" id="filtroServicio" list="serviciosListReporte" autocomplete="off" placeholder="Buscar servicio...">
            <datalist id="serviciosListReporte"></datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="filtroFacturante">Facturante:</label>
            <input type="text" id="filtroFacturante" list="facturantesListReporte" autocomplete="off" placeholder="Buscar facturante...">
            <datalist id="facturantesListReporte"></datalist>
          </div>
          <div class="form-group">
            <label for="filtroPeriodo">Período:</label>
            <input type="month" id="filtroPeriodo">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" id="aplicarFiltros" class="btn-primary">Aplicar Filtros</button>
          <button type="button" id="limpiarFiltros" class="btn-secondary">Limpiar Filtros</button>
        </div>
      </form>
    </div>

    <div id="resultadoReporte" class="tabla-reporte">
      <p class="placeholder-text">Aplique los filtros para generar el reporte</p>
    </div>
    <div class="export-buttons" style="display:none;">
      <button id="exportarPDF" class="btn-primary">Exportar a PDF</button>
      <button id="exportarWord" class="btn-secondary">Exportar a Word</button>
      <button id="exportarExcel" class="btn-secondary">Exportar a Excel</button>
    </div>
  `;

  // Configurar eventos después de renderizar
  setTimeout(async () => {
    await configurarAutocompletadoReportes();

    document.getElementById("aplicarFiltros")?.addEventListener("click", aplicarFiltros);
    document.getElementById("limpiarFiltros")?.addEventListener("click", limpiarFiltros);
    document.getElementById("exportarPDF")?.addEventListener("click", exportarPDF);
    document.getElementById("exportarWord")?.addEventListener("click", exportarWord);
    document.getElementById("exportarExcel")?.addEventListener("click", exportarExcel);
  }, 50);
}

async function generarReporte() {
  try {
    console.log("Generando reporte...");

    // 1. Mostrar estado de carga
    const contenedorResultados = document.getElementById("resultados-reporte");
    if (!contenedorResultados) {
      throw new Error("Contenedor de resultados no encontrado");
    }
    contenedorResultados.innerHTML = "<p>Cargando datos...</p>";

    // 2. Obtener datos filtrados
    const filtros = {
      fechaInicio: document.getElementById("filtroFechaInicio")?.value,
      fechaFin: document.getElementById("filtroFechaFin")?.value
      // Agregar más filtros según necesites
    };

    const datos = await ipcRenderer.invoke('obtener-datos-reporte', filtros);

    // 3. Mostrar resultados
    if (datos && datos.length > 0) {
      mostrarResultados(datos);
    } else {
      contenedorResultados.innerHTML = "<p>No se encontraron resultados</p>";
    }
  } catch (error) {
    console.error("Error al generar reporte:", error);
    mostrarNotificacion("Error al generar el reporte", "error");
  }
}

// Función para aplicar filtros
async function aplicarFiltros() {
  try {
    const filtros = obtenerValoresFiltros();

    if (!validarFiltros(filtros)) {
      mostrarMensaje("Por favor ingrese al menos un criterio de filtrado", "error");
      return;
    }

    mostrarCargando();

    const facturaciones = await ipcRenderer.invoke('get-facturacion-filtered', filtros);

    if (facturaciones.length === 0) {
      mostrarMensaje("No se encontraron resultados con los filtros aplicados", "info");
      ocultarBotonesExportacion();
    } else {
      mostrarResultados(facturaciones, filtros); // Pasamos los filtros también
      mostrarBotonesExportacion();
    }
  } catch (error) {
    console.error("Error al aplicar filtros:", error);
    mostrarMensaje("Error al generar el reporte", "error");
  }
}

// Función para obtener valores de los filtros
function obtenerValoresFiltros() {
  return {
    cliente: document.getElementById("filtroCliente")?.value.trim() || "",
    servicio: document.getElementById("filtroServicio")?.value.trim() || "",
    facturante: document.getElementById("filtroFacturante")?.value.trim() || "",
    periodo: document.getElementById("filtroPeriodo")?.value || ""
  };
}

// Función para validar que al menos un filtro esté completo
function validarFiltros(filtros) {
  return filtros.cliente || filtros.servicio || filtros.facturante || filtros.periodo;
}

// Función para mostrar estado de carga
function mostrarCargando() {
  document.getElementById("resultadoReporte").innerHTML = `
    <div class="spinner-container">
      <div class="spinner"></div>
      <p>Cargando datos...</p>
    </div>
  `;
}

// Función para mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo = "info") {
  const contenedor = document.getElementById("resultadoReporte");
  contenedor.innerHTML = `<p class="message ${tipo}">${mensaje}</p>`;
}

// Función para mostrar resultados en tabla
async function mostrarResultados(facturaciones, filtros) {
  facturacionesActuales = facturaciones;
  const contenedor = document.getElementById("resultadoReporte");

  if (!facturaciones || facturaciones.length === 0) {
    contenedor.innerHTML = '<p class="message info">No se encontraron resultados</p>';
    return;
  }

  // Determinar qué tipo de filtro se aplicó
  const filtroPrincipal = determinarFiltroPrincipal(filtros);

  try {
    // Generar tabla según el filtro
    let tablaHTML = '';
    switch (filtroPrincipal) {
      case 'servicio':
        tablaHTML = generarTablaPorServicio(facturaciones);
        break;
      case 'periodo':
        tablaHTML = await generarTablaPorPeriodo(facturaciones, filtros.periodo); // Ahora es async
        break;
      case 'facturante':
        tablaHTML = generarTablaPorFacturante(facturaciones);
        break;
      case 'cliente':
        tablaHTML = generarTablaPorCliente(facturaciones);
        break;
      default:
        tablaHTML = generarTablaGeneral(facturaciones, filtros); // Pasamos filtros por si acaso
    }

    contenedor.innerHTML = tablaHTML;

    // Solo si es filtro por periodo, mostrar gastos internos
    if (filtroPrincipal === 'periodo' && filtros.periodo) {
      await mostrarGastosInternosPorPeriodo(filtros.periodo);
    }

    filtrosAplicados = filtros; // Guardar los filtros actuales para PDF
  } catch (error) {
    console.error("Error al mostrar resultados:", error);
    contenedor.innerHTML = '<p class="message error">Error al generar el reporte</p>';
  }
}


// Filtros

function generarTablaPorCliente(facturaciones) {
  const primerRegistro = facturaciones[0];
  const cuitCliente = primerRegistro.clienteData?.cuit || primerRegistro.cuit;

  return `
    <h3>Reporte del Cliente: ${primerRegistro.cliente}</h3>
    ${primerRegistro.cuit ? `<p><strong>CUIT:</strong> ${formatearCUIT(primerRegistro.cuit)}</p>` : ''}
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Servicio</th>
          <th>Horas Trabajadas</th>
          <th>Horas Liquidadas</th>
          <th>Valor Hora</th>
          <th>Facturante</th>
          <th>Tipo Factura</th>
          <th>N° Factura</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${facturaciones.map(fact => `
          <tr>
            <td>${formatMonth(fact.periodo)}</td>
            <td>${fact.servicio}</td>
            <td class="number">${fact.horas.trabajadas}</td>
            <td class="number">${fact.horas.liquidadas}</td>
            <td class="currency">${formatoMonetario(fact.valores.hora)}</td>
            <td>${fact.facturante}</td>
            <td>${fact.factura.tipo}</td>
            <td>${fact.factura.numero || 'N/A'}</td>
            <td class="currency">${formatoMonetario(fact.valores.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="8">TOTAL</td>
          <td class="currency">${formatoMonetario(facturaciones.reduce((sum, f) => sum + f.valores.total, 0))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// Función para formatear el CUIT (XX-XXXXXXXX-X)
function formatearCUIT(cuit) {
  if (!cuit) return 'N/A';
  // Eliminar cualquier caracter que no sea número
  const soloNumeros = cuit.toString().replace(/\D/g, '');

  // Aplicar formato XX-XXXXXXXX-X
  return `${soloNumeros.substring(0, 2)}-${soloNumeros.substring(2, 10)}-${soloNumeros.substring(10, 11)}`;
}

function generarTablaPorServicio(facturaciones) {
  // Agrupar por periodo ya que es el mismo servicio
  const agrupadoPorPeriodo = facturaciones.reduce((acc, fact) => {
    if (!acc[fact.periodo]) {
      acc[fact.periodo] = {
        ...fact,
        horas_trabajadas_total: 0,
        total_general: 0
      };
    }
    acc[fact.periodo].horas_trabajadas_total += fact.horas.trabajadas;
    acc[fact.periodo].total_general += fact.valores.total;
    return acc;
  }, {});

  const datosAgrupados = Object.values(agrupadoPorPeriodo);
  const primerRegistro = facturaciones[0];

  return `
    <h3>Reporte del Servicio: ${primerRegistro.servicio}</h3>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Horas Autorizadas</th>
          <th>Horas Trabajadas</th>
          <th>Valor Hora</th>
          <th>Facturante</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${datosAgrupados.map(fact => `
          <tr>
            <td>${formatMonth(fact.periodo)}</td>
            <td class="number">${fact.horas.autorizadas}</td>
            <td class="number">${fact.horas_trabajadas_total}</td>
            <td class="currency">${formatoMonetario(fact.valores.hora)}</td>
            <td>${fact.facturante}</td>
            <td class="currency">${formatoMonetario(fact.total_general)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="5">TOTAL</td>
          <td class="currency">${formatoMonetario(datosAgrupados.reduce((sum, f) => sum + f.total_general, 0))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function generarTablaPorFacturante(facturaciones) {
  const primerRegistro = facturaciones[0];

  return `
    <h3>Reporte del Facturante: ${primerRegistro.facturante}</h3>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Periodo</th>
          <th>Tipo Factura</th>
          <th>N° Factura</th>
          <th>Horas Trabajadas</th>
          <th>Neto</th>
          <th>IVA</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${facturaciones.map(fact => `
          <tr>
            <td>${fact.cliente}</td>
            <td>${fact.servicio}</td>
            <td>${formatMonth(fact.periodo)}</td>
            <td>${fact.factura.tipo}</td>
            <td>${fact.factura.numero || 'N/A'}</td>
            <td class="number">${fact.horas.trabajadas}</td>
            <td class="currency">${formatoMonetario(fact.valores.neto)}</td>
            <td class="currency">${formatoMonetario(fact.valores.iva)}</td>
            <td class="currency">${formatoMonetario(fact.valores.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="8">TOTAL</td>
          <td class="currency">${formatoMonetario(facturaciones.reduce((sum, f) => sum + f.valores.total, 0))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

try {
  // Lee el archivo clientes.json ubicado en la raíz del proyecto
  const data = fs.readFileSync(path.join(__dirname, 'clientes.json'), 'utf8');

  // Parseamos el contenido del archivo JSON a un objeto JavaScript
  clientes = JSON.parse(data);

  // Puedes imprimir para ver si se cargaron correctamente los clientes
  console.log(clientes);
} catch (error) {
  console.error("Error cargando clientes.json:", error);
}

// Modificar la función para hacerla async
async function buscarCuitPorNombre(nombreCliente) {
  if (!nombreCliente) return "N/A";

  if (clientes.length === 0) {
    await cargarDatosIniciales();
  }

  const cliente = clientes.find(c =>
    normalizarTexto(c.nombre) === normalizarTexto(nombreCliente)
  );

  return cliente?.cuit || "N/A";
}

console.log("Clientes cargados:", clientes);
console.log("Facturaciones recibidas:", facturaciones.map(f => f.cliente));
console.log("Clientes disponibles:", clientes.map(c => c.nombre));

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

console.log("Ejemplo de búsqueda - Servicio 'Dycsa':", {
  existe: servicios.some(s => s.nombre === 'Dycsa'),
  serviciosSimilares: servicios.filter(s =>
    s.nombre.toLowerCase().includes('dycsa')
  )
});

const periodoSeleccionado = filtro.periodo;
mostrarGastosInternosPorPeriodo(periodoSeleccionado);

// Llamar esta función al inicio
cargarDatosIniciales();

// Cargar servicios.json una sola vez
try {
  const data = fs.readFileSync(path.join(__dirname, 'servicios.json'), 'utf8');
  servicios = JSON.parse(data);
} catch (error) {
  console.error("Error al cargar servicios.json:", error);
}

async function cargarDatosIniciales() {
  try {
    [clientes, servicios] = await Promise.all([
      ipcRenderer.invoke('get-clientes').catch(() => []),
      ipcRenderer.invoke('get-servicios').catch(() => [])
    ]);
    console.log("Datos cargados:", {
      clientes: clientes.length,
      servicios: servicios.length
    });
  } catch (error) {
    console.error("Error inicializando datos:", error);
  }
}

async function generarTablaPorPeriodo(facturaciones, periodo) {
  // 1. Asegurar que los servicios estén cargados
  if (servicios.length === 0) {
    try {
      servicios = await ipcRenderer.invoke('get-servicios');
      console.log("Servicios cargados:", servicios.length);
    } catch (error) {
      console.error("Error cargando servicios:", error);
      servicios = [];
    }
  }

  // 2. Generar filas de la tabla
  const rows = await Promise.all(facturaciones.map(async (fact) => {
    // Buscar el servicio correspondiente (comparación insensible a mayúsculas/acentos)
    const servicio = servicios.find(s =>
      normalizarTexto(s.nombre) === normalizarTexto(fact.servicio)
    );

    // Diagnóstico (puedes remover esto después)
    if (!servicio) {
      console.warn(`Servicio no encontrado: "${fact.servicio}"`, {
        serviciosDisponibles: servicios.map(s => s.nombre)
      });
    }

    const cuit = await buscarCuitPorNombre(fact.cliente);

    return `
      <tr>
        <td>${formatearCUIT(cuit)}</td>
        <td>${fact.cliente}</td>
        <td>${fact.servicio}</td>
        <td class="number">${servicio?.horasAutorizadas ?? 'N/A'}</td>
        <td class="number">${fact.horas.trabajadas}</td>
        <td class="number">${fact.horas.liquidadas}</td>
        <td class="currency">${formatoMonetario(fact.valores.hora)}</td>
        <td class="currency">${formatoMonetario(fact.valores.total)}</td>
      </tr>
    `;
  }));

  // 3. Calcular totales
  const totalFacturado = facturaciones.reduce((sum, f) => sum + (f.valores?.total || 0), 0);

  // 4. Generar la tabla HTML
  return `
    <h3>Reporte del período: ${formatMonth(periodo)}</h3>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>CUIT</th>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Hs. Autorizadas</th>
          <th>Hs. Trabajadas</th>
          <th>Hs. Liquidadas</th>
          <th>Valor Hora</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="7">TOTAL FACTURADO</td>
          <td class="currency">${formatoMonetario(totalFacturado)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

mostrarGastosInternosPorPeriodo(periodoFiltrado);

// Función para renderizar gastos internos del período
function mostrarGastosInternosPorPeriodo(periodo, contenedorDestinoId = 'div3') {
  fetch('gastosInternos.json')
    .then(res => res.json())
    .then(gastos => {
      const gastosPeriodo = gastos.filter(g => g.periodo === periodo);
      const totalGastos = gastosPeriodo.reduce((sum, g) => sum + parseFloat(g.total || 0), 0);

      const tabla = document.createElement('table');
      tabla.className = 'styled-table';
      tabla.innerHTML = `
        <thead>
          <tr>
            <th>Sector</th>
            <th>Servicio</th>
            <th>Hs Trabajadas</th>
            <th>Hs Liquidadas</th>
            <th>Valor Hora ($)</th>
            <th>Aumento (%)</th>
            <th>Neto ($)</th>
            <th>Total ($)</th>
          </tr>
        </thead>
        <tbody>
          ${gastosPeriodo.map(g => `
            <tr>
              <td>${g.sector || '-'}</td>
              <td>${g.servicio || '-'}</td>
              <td>${g.hsTrabajadas?.toFixed(2) || '0.00'}</td>
              <td>${g.hsLiquidadas?.toFixed(2) || '0.00'}</td>
              <td>$${g.valorHora?.toFixed(2) || '0.00'}</td>
              <td>${g.aumento?.toFixed(2) || '0.00'}%</td>
              <td>$${g.neto?.toFixed(2) || '0.00'}</td>
              <td><strong>$${g.total?.toFixed(2) || '0.00'}</strong></td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="7"><strong>Total de gastos</strong></td>
            <td><strong>$${totalGastos.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      `;

      // Insertar tabla en el contenedor destino
      const contenedor = document.getElementById(contenedorDestinoId);
      contenedor.appendChild(document.createElement('hr'));
      const subtitulo = document.createElement('h3');
      subtitulo.textContent = `🧾 Gastos Internos del período ${periodo}`;
      contenedor.appendChild(subtitulo);
      contenedor.appendChild(tabla);

      // Solo agregar el resultado neto si aún no existe
      const EXISTE_RESULTADO = document.getElementById('resultadoNetoGlobal');
      if (!EXISTE_RESULTADO) {
        const totalFacturadoElement = document.getElementById('totalFacturadoPeriodo');
        const totalFacturado = totalFacturadoElement ? parseFloat(totalFacturadoElement.dataset.total || 0) : 0;
        const diferencia = totalFacturado - totalGastos;

        const resultado = document.createElement('p');
        resultado.id = 'resultadoNetoGlobal'; // clave para no repetirlo
        resultado.innerHTML = `<strong>💼 Resultado Neto: $${diferencia.toFixed(2)}</strong>`;
        resultado.style.marginTop = '1em';
        resultado.style.fontSize = '1.2em';
        contenedor.appendChild(resultado);
      }
    })
    .catch(err => {
      console.error('Error al cargar gastosInternos.json:', err);
    });
}


function generarTablaGeneral(facturaciones, filtros) {
  // Aquí puedes usar los filtros para ajustar la tabla si es necesario
  return `
    <h3>Reporte General de Facturación</h3>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Facturante</th>
          <th>Horas</th>
          <th>Tipo Factura</th>
          <th>N° Factura</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${facturaciones.map(fact => `
          <tr>
            <td>${formatMonth(fact.periodo)}</td>
            <td>${fact.cliente}</td>
            <td>${fact.servicio}</td>
            <td>${fact.facturante}</td>
            <td class="number">${fact.horas.liquidadas}</td>
            <td>${fact.factura.tipo}</td>
            <td>${fact.factura.numero || '-'}</td>
            <td class="currency">${formatoMonetario(fact.valores.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="7">TOTAL</td>
          <td class="currency">${formatoMonetario(facturaciones.reduce((sum, f) => sum + f.valores.total, 0))}</td>
        </tr>
      </tbody>
    </table>
  `;
}


// Función para limpiar filtros
function limpiarFiltros() {
  document.getElementById("filtroCliente").value = "";
  document.getElementById("filtroServicio").value = "";
  document.getElementById("filtroFacturante").value = "";
  document.getElementById("filtroPeriodo").value = "";

  document.getElementById("resultadoReporte").innerHTML =
    '<p class="placeholder-text">Aplique los filtros para generar el reporte</p>';

  ocultarBotonesExportacion();
}

// Función para mostrar/ocultar botones de exportación
function mostrarBotonesExportacion() {
  document.querySelector(".export-buttons").style.display = "block";
}

function ocultarBotonesExportacion() {
  document.querySelector(".export-buttons").style.display = "none";
}

// Funciones de formato
function formatMonth(monthString) {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatoMonetario(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

async function exportarPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString();

    const tabla = document.querySelector(".reporte-table");
    if (!tabla) {
      mostrarNotificacion("No hay datos para exportar. Genere un reporte primero.", "error");
      return;
    }

    const tituloReporte = obtenerTituloReporte();

    const logoData = await cargarImagenComoBase64('assets/logorrss.jpg');
    doc.addImage(logoData, 'JPEG', 10, 10, 20, 20);
    doc.setFontSize(16);
    doc.text("Reporte de Facturación", 35, 20);
    doc.setFontSize(12);
    doc.text(tituloReporte, 35, 28);
    doc.setFontSize(10);
    doc.text(`Generado el: ${fechaHoy}`, 10, 35);

    const startY = tituloReporte.length > 40 ? 45 : 40;

    // Tabla de facturaciones
    doc.autoTable({
      html: tabla,
      startY: startY,
      theme: 'grid',
      headStyles: { fillColor: [255, 140, 74] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        4: { cellWidth: 'auto' },
        7: { cellWidth: 'auto' }
      },
      margin: { top: startY + 5 }
    });

    // 🚩 Paso nuevo: agregar gastos internos si el filtro es por periodo
    if (filtrosAplicados?.periodo) {
      const periodoSeleccionado = filtrosAplicados.periodo;

      const fs = require('fs').promises;
      const path = require('path');
      const rutaGastos = path.join(__dirname, "data", "gastosInternos.json");

      let gastosDelPeriodo = [];

      try {
        const datosGastos = await fs.readFile(rutaGastos, "utf-8");
        const todosLosGastos = JSON.parse(datosGastos);
        gastosDelPeriodo = todosLosGastos.filter(g => g.periodo === periodoSeleccionado);
      } catch (err) {
        console.error("Error al leer gastosInternos.json:", err);
      }

      if (gastosDelPeriodo.length > 0) {
        if (gastosDelPeriodo.length > 0) {
          doc.text("Gastos Internos del Periodo", 14, doc.lastAutoTable.finalY + 10);

          const tablaGastos = gastosDelPeriodo.map(gasto => [
            gasto.sector || "Sin sector",
            gasto.servicio || "Sin servicio",
            gasto.hsLiquidadas ?? 0,
            `$${gasto.valorHora?.toFixed(2) || "0.00"}`,
            `${gasto.aumento?.toFixed(2) || 0}%`,
            `$${gasto.total?.toFixed(2) || "0.00"}`
          ]);

          doc.autoTable({
            head: [["Sector", "Servicio", "Hs Liquidadas", "Valor Hora", "Aumento", "Total"]],
            body: tablaGastos,
            startY: doc.lastAutoTable.finalY + 15,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [200, 200, 200] },
          });
        }
      }
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte_facturacion.pdf';
    link.style.display = 'none';
    document.body.appendChild(link);

    link.addEventListener('click', () => {
      setTimeout(() => {
        mostrarNotificacion("PDF guardado con éxito", "success");
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);
    });

    link.click();

  } catch (error) {
    console.error("Error al exportar a PDF:", error);
    mostrarNotificacion("Ocurrió un error al generar el PDF", "error");
  }
}

function obtenerFiltroActual() {
  const selectFiltro = document.getElementById("filtro-select"); // Asegurate de tener este ID
  return selectFiltro ? selectFiltro.value : null;
}

function obtenerValorFiltro() {
  const inputFiltro = document.getElementById("valor-filtro"); // Ajustá el ID si es otro
  return inputFiltro ? inputFiltro.value.trim() : null;
}


// Función para determinar el título según el filtro aplicado
function obtenerTituloReporte() {
  const filtros = obtenerValoresFiltros();
  const filtroPrincipal = determinarFiltroPrincipal(filtros);

  switch (filtroPrincipal) {
    case 'servicio':
      return `Filtrado por Servicio: ${filtros.servicio}`;
    case 'periodo':
      return `Filtrado por Período: ${formatMonth(filtros.periodo)}`;
    case 'facturante':
      return `Filtrado por Facturante: ${filtros.facturante}`;
    case 'cliente':
      // Obtener nombre cliente del primer registro (si está visible)
      const nombreCliente = document.querySelector(".reporte-table td:nth-child(2)")?.textContent || filtros.cliente;
      return `Filtrado por Cliente: ${nombreCliente}`;
    default:
      return "Reporte General";
  }
}

// Función auxiliar para determinar el filtro principal
function determinarFiltroPrincipal(filtros) {
  if (filtros.servicio) return 'servicio';
  if (filtros.periodo) return 'periodo';
  if (filtros.facturante) return 'facturante';
  if (filtros.cliente) return 'cliente';
  return 'general';
}

// Función auxiliar para cargar imágenes como base64
function cargarImagenComoBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = (err) => {
      console.error("Error cargando imagen:", err);
      reject(err);
    };
    img.src = url;
  });
}

async function exportarWord() {
  const tabla = document.querySelector(".reporte-table");
  if (!tabla) return alert("No hay tabla para exportar");

  try {
    // Cargar la imagen y convertir a base64
    const response = await fetch("assets/logorrss.jpg");
    if (!response.ok) throw new Error("No se pudo cargar el logo");
    const blob = await response.blob();

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        // Cortar cada 76 caracteres (requisito MIME)
        const formattedBase64 = base64data.match(/.{1,76}/g).join('\r\n');
        resolve(formattedBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const contentType = blob.type; // por ejemplo, image/jpeg

    // Contenido HTML embebido en el MHTML
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif;">
          <table style="margin-bottom: 20px;">
            <tr>
              <td><img src="cid:logoImage" width="80" height="80" /></td>
              <td style="vertical-align: middle; padding-left: 10px;">
                <h2>Reporte de Facturación</h2>
              </td>
            </tr>
          </table>
          ${tabla.outerHTML}
        </body>
      </html>
    `;

    // Armar el documento MHTML
    const mhtml =
      `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_000_0000"; type="text/html"

------=_NextPart_000_0000
Content-Type: text/html; charset="utf-8"
Content-Location: file:///document.html

${html}

------=_NextPart_000_0000
Content-Location: logoImage
Content-Type: ${contentType}
Content-Transfer-Encoding: base64

${base64}
------=_NextPart_000_0000--`;

    // Crear y descargar el archivo
    const blobDoc = new Blob([mhtml], {
      type: "application/msword;charset=utf-8",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blobDoc);
    link.download = "reporte_facturacion.doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error("Error exportando Word con logo:", err);
    alert("Ocurrió un error al generar el archivo Word.");
  }
}

async function exportarExcel() {
  try {
    const tabla = document.querySelector(".reporte-table");
    if (!tabla) {
      mostrarNotificacion("No hay datos para exportar. Genere un reporte primero.", "error");
      return;
    }

    // Convertir la tabla HTML a un libro de trabajo de Excel
    const workbook = XLSX.utils.table_to_book(tabla);

    // Mostrar diálogo de guardado nativo del navegador
    const fileName = 'reporte_facturacion.xlsx';

    // Usar XLSX.writeFile que maneja su propio diálogo de guardado
    XLSX.writeFile(workbook, fileName, {
      bookType: 'xlsx',
      compression: true
    });

    // No hay forma directa de detectar cuando el usuario guarda, pero podemos
    // asumir que si no hay error, el archivo se guardó
    mostrarNotificacion("Archivo Excel guardado en Descargas", "success");

  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    mostrarNotificacion("Ocurrió un error al exportar a Excel", "error");
  }
}

// Función para mostrar notificaciones estilizadas
function mostrarNotificacion(mensaje, tipo = "info") {
  // Eliminar notificaciones previas si existen
  const notificacionesPrevias = document.querySelectorAll('.custom-notification');
  notificacionesPrevias.forEach(notif => notif.remove());

  // Crear elemento de notificación
  const notificacion = document.createElement('div');
  notificacion.className = `custom-notification ${tipo}`;
  notificacion.textContent = mensaje;

  // Estilos básicos para la notificación
  notificacion.style.position = 'fixed';
  notificacion.style.bottom = '20px';
  notificacion.style.right = '20px';
  notificacion.style.padding = '15px';
  notificacion.style.borderRadius = '5px';
  notificacion.style.color = 'white';
  notificacion.style.zIndex = '1000';
  notificacion.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  notificacion.style.transition = 'opacity 0.5s ease-in-out';

  // Colores según el tipo
  const colores = {
    success: '#4CAF50',
    error: '#F44336',
    info: '#2196F3',
    warning: '#FF9800'
  };

  notificacion.style.backgroundColor = colores[tipo] || colores.info;

  // Agregar al DOM
  document.body.appendChild(notificacion);

  // Desvanecer después de 5 segundos
  setTimeout(() => {
    notificacion.style.opacity = '0';
    setTimeout(() => notificacion.remove(), 500);
  }, 5000);
}

function asegurarCanvasResumen() {
  if (!document.getElementById("graficoResumen")) {
    const canvas = document.createElement("canvas");
    canvas.id = "graficoResumen";
    canvas.width = 600;
    canvas.height = 300;
    canvas.style.display = "none"; // Oculto
    document.body.appendChild(canvas); // Puede ir en cualquier parte
  }
}

async function generarGraficoYAgregarAlPDF(doc) {
  asegurarCanvasResumen();
  const canvas = document.getElementById("graficoResumen");

  // Agrupar totales por cliente (podés cambiar a por servicio o periodo)
  const agrupadoPorCliente = {};
  facturaciones.forEach((f) => {
    const cliente = f.cliente;
    if (!agrupadoPorCliente[cliente]) agrupadoPorCliente[cliente] = 0;
    agrupadoPorCliente[cliente] += f.valores.total;
  });

  const etiquetas = Object.keys(agrupadoPorCliente);
  const valores = Object.values(agrupadoPorCliente);

  const grafico = new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Total facturado por cliente",
        data: valores,
        backgroundColor: "#FF8C4A",
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return `$${formatoMonetario(value)}`;
            },
          },
        },
      },
    },
  });

  await new Promise(resolve => setTimeout(resolve, 800));

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 180;
  const imgHeight = 90;
  const posicionY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 60;

  doc.addImage(imgData, "PNG", 15, posicionY, imgWidth, imgHeight);

  grafico.destroy();
}

const botonExportarPDF = document.getElementById("botonExportarPDF");

if (botonExportarPDF) {  // Verificamos que el botón exista antes de agregar el evento
  botonExportarPDF.addEventListener("click", async () => {
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString();

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 140, 74] },
      didDrawPage: function (data) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Exportado el: ${fechaHoy}`, data.settings.margin.left, 10);
      },
    });

    await generarGraficoYAgregarAlPDF(doc);

    doc.save("reporte_facturacion.pdf");
  });
} else {
  console.warn("No se encontró el botón botonExportarPDF.");
}