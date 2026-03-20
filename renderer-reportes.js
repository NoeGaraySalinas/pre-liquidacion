// renderer-reportes.js

const htmlToDocx = require("html-to-docx");
const { saveAs } = require("file-saver");
const os = require("os");

// ============================================
// VERIFICAR ENTORNO
// ============================================
console.log(`📄 ${document.currentScript?.src?.split('/').pop() || 'renderer'} - Entorno:`, 
  window.APP_ENV?.isDevelopment ? 'Desarrollo 🛠️' : 
  (window.APP_ENV?.ready ? 'Producción 🚀' : 'No inicializado'));

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  SectionType,
  ImageRun,
} = require("docx");

let filtroPeriodoSeleccionado = null;
let filtroClienteSeleccionado = null;
let filtroServicioSeleccionado = null;
let filtroFacturanteSeleccionado = null;

function mostrarNotificacion(mensaje, tipo = "info") {
  console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
  alert(mensaje);
}

function cargarImagenComoBase64(ruta) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = reject;
    img.src = ruta;
  });
}


// Función para cargar imagen como ArrayBuffer (para que Word no diga que está corrupta)
async function cargarImagen(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la imagen");
  return await response.arrayBuffer();
}


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

// === CARGA DE INSUMOS PARA REPORTES ===
const rutaInsumosReportes = path.join(__dirname, 'insumos.json');
let insumos = [];

function cargarInsumosParaReportes() {
  if (!fs.existsSync(rutaInsumosReportes)) {
    console.warn('insumos.json no existe, creando vacío...');
    insumos = [];
    return;
  }

  try {
    const data = fs.readFileSync(rutaInsumosReportes, 'utf8');
    insumos = JSON.parse(data);
    console.log(`Insumos cargados en Reportes: ${insumos.length}`);
  } catch (err) {
    console.error("Error cargando insumos:", err);
    insumos = [];
  }
}

// Ejecutar al inicio del módulo
cargarInsumosParaReportes();

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

  // 🧹 Limpieza inicial
  contenedor.innerHTML = "";
  ocultarBotonesExportacion();

  if (!facturaciones || facturaciones.length === 0) {
    contenedor.innerHTML = '<p class="message info">No se encontraron resultados</p>';
    return;
  }

  const filtroPrincipal = determinarFiltroPrincipal(filtros);

  try {
    let tablaHTML = "";

    switch (filtroPrincipal) {
      case "servicio":
        tablaHTML = await generarTablaPorServicio(facturaciones);
        break;

      case "periodo":
        tablaHTML = await generarTablaPorPeriodo(facturaciones, filtros.periodo);
        break;

      case "facturante":
        tablaHTML = generarTablaPorFacturante(facturaciones);
        break;

      case "cliente":
        tablaHTML = generarTablaPorCliente(facturaciones, filtros);
        break;

      default:
        tablaHTML = generarTablaGeneral(facturaciones, filtros);
    }

    // 🖨 Render principal (una sola vez, siempre)
    contenedor.innerHTML = tablaHTML;

    // ➕ Extras SOLO donde corresponde

    // Periodo → gastos + insumos
    if (filtroPrincipal === "periodo" && filtros.periodo) {
      await mostrarGastosInternosPorPeriodo(filtros.periodo);
      await mostrarInsumosPorPeriodo(filtros.periodo, "resultadoReporte");
    }

    // Cliente → insumos
    if (filtroPrincipal === "cliente" && filtros.cliente) {
      await mostrarInsumosPorCliente(filtros.cliente, "resultadoReporte");
    }

    // Servicio → gastos internos
    if (filtroPrincipal === "servicio" && filtros.servicio) {
      await mostrarGastosInternosPorServicio(filtros.servicio, "resultadoReporte");
    }

    if (filtroPrincipal === 'facturante') {
      await mostrarInsumosPorFacturante(facturaciones[0].facturante, "resultadoReporte");

    }


    filtrosAplicados = filtros;
    mostrarBotonesExportacion();

  } catch (error) {
    console.error("Error al mostrar resultados:", error);
    contenedor.innerHTML =
      '<p class="message error">Error al generar el reporte</p>';
    ocultarBotonesExportacion();
  }
}

async function mostrarInsumosPorFacturante(facturante, contenedorId) {
  let insumos = [];

  try {
    insumos = await ipcRenderer.invoke('get-insumos');
  } catch (e) {
    console.error("Error cargando insumos:", e);
    return;
  }

  const filtrados = insumos.filter(
    i => i.facturante === facturante
  );

  const contenedor = document.getElementById(contenedorId);

  if (filtrados.length === 0) {
    contenedor.innerHTML +=
      '<p class="message info">No hay insumos facturados por este facturante</p>';
    return;
  }

  const total = filtrados.reduce((s, i) => s + i.total, 0);

  contenedor.innerHTML += `
    <h4>Insumos facturados</h4>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Tipo</th>
          <th>N° Factura</th>
          <th>Items</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${filtrados.map(i => `
          <tr>
            <td>${new Date(i.fecha).toLocaleDateString()}</td>
            <td>${i.cliente}</td>
            <td>${i.tipo}</td>
            <td>${i.numero}</td>
            <td class="number">${i.items.length}</td>
            <td class="currency">${formatoMonetario(i.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="5">TOTAL INSUMOS</td>
          <td class="currency">${formatoMonetario(total)}</td>
        </tr>
      </tbody>
    </table>
  `;
}



// Filtros

function generarTablaPorCliente(facturaciones, filtros) {
  if (!facturaciones || facturaciones.length === 0) {
    return '<p class="message info">No hay facturaciones para este cliente</p>';
  }

  const nombreCliente =
    filtros?.cliente ||
    facturaciones[0]?.cliente ||
    "Cliente";

  const cuit =
    facturaciones[0]?.clienteData?.cuit ||
    facturaciones[0]?.cuit ||
    "";

  // 🔹 Insumos del cliente
  const insumosCliente = Array.isArray(insumos)
    ? insumos.filter(i => i.cliente === nombreCliente)
    : [];

  const totalFacturado = facturaciones.reduce(
    (sum, f) => sum + (f.valores?.total || 0),
    0
  );

  const totalInsumos = insumosCliente.reduce(
    (sum, i) => sum + (i.total || 0),
    0
  );

  return `
    <h3>Reporte del Cliente: ${nombreCliente}</h3>
    ${cuit ? `<p><strong>CUIT:</strong> ${formatearCUIT(cuit)}</p>` : ""}

    <!-- ================= FACTURACIONES ================= -->
    <h4>Facturaciones</h4>
    <table class="reporte-table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Servicio</th>
          <th>Hs. Trabajadas</th>
          <th>Hs. Liquidadas</th>
          <th>Valor Hora</th>
          <th>Facturante</th>
          <th>Tipo</th>
          <th>N° Factura</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${facturaciones.map(f => `
          <tr>
            <td>${formatMonth(f.periodo)}</td>
            <td>${f.servicio}</td>
            <td class="number">${f.horas.trabajadas}</td>
            <td class="number">${f.horas.liquidadas}</td>
            <td class="currency">${formatoMonetario(f.valores.hora)}</td>
            <td>${f.facturante}</td>
            <td>${f.factura.tipo}</td>
            <td>${f.factura.numero || "N/A"}</td>
            <td class="currency">${formatoMonetario(f.valores.total)}</td>
          </tr>
        `).join("")}
        <tr class="total-row">
          <td colspan="8">TOTAL FACTURADO</td>
          <td class="currency">${formatoMonetario(totalFacturado)}</td>
        </tr>
      </tbody>
    </table>

    <!-- ================= INSUMOS ================= -->
    <h4>Insumos facturados</h4>

    ${insumosCliente.length === 0
      ? '<p class="message info">No hay insumos facturados para este cliente</p>'
      : `
          <table class="reporte-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Facturante</th>
                <th>Tipo</th>
                <th>N° Factura</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${insumosCliente.map(i => `
                <tr>
                  <td>${new Date(i.fecha).toLocaleDateString()}</td>
                  <td>${i.facturante}</td>
                  <td>${i.tipo}</td>
                  <td>${i.numero}</td>
                  <td class="number">${i.items.length}</td>
                  <td class="currency">${formatoMonetario(i.total)}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td colspan="5">TOTAL INSUMOS</td>
                <td class="currency">${formatoMonetario(totalInsumos)}</td>
              </tr>
            </tbody>
          </table>
        `
    }
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

async function generarTablaPorServicio(facturaciones) {
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

  // ✅ BUSCAR SERVICIO REAL
  const servicio = await ipcRenderer.invoke(
    "get-servicio-por-nombre",
    primerRegistro.servicio
  );

  const horasAutorizadas = servicio?.horasAutorizadas ?? "—";

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
            <td class="number">${horasAutorizadas}</td>
            <td class="number">${fact.horas_trabajadas_total}</td>
            <td class="currency">${formatoMonetario(fact.valores.hora)}</td>
            <td>${fact.facturante}</td>
            <td class="currency">${formatoMonetario(fact.total_general)}</td>
          </tr>
        `).join("")}

        <tr class="total-row">
          <td colspan="5">TOTAL</td>
          <td class="currency">
            ${formatoMonetario(
    datosAgrupados.reduce((sum, f) => sum + f.total_general, 0)
  )}
          </td>
        </tr>
      </tbody>
    </table>
  `;
}


function generarTablaPorFacturante(facturaciones) {
  if (!facturaciones || facturaciones.length === 0) {
    return '<p class="message info">No hay facturaciones para este facturante</p>';
  }

  const facturante = facturaciones[0].facturante;

  const totalFacturado = facturaciones.reduce(
    (sum, f) => sum + (f.valores?.total || 0),
    0
  );

  return `
    <h3>Reporte del Facturante: ${facturante}</h3>

    <table class="reporte-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Periodo</th>
          <th>Tipo</th>
          <th>N° Factura</th>
          <th>Horas</th>
          <th>Neto</th>
          <th>IVA</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${facturaciones.map(f => `
          <tr>
            <td>${f.cliente}</td>
            <td>${f.servicio}</td>
            <td>${formatMonth(f.periodo)}</td>
            <td>${f.factura.tipo}</td>
            <td>${f.factura.numero || 'N/A'}</td>
            <td class="number">${f.horas.trabajadas}</td>
            <td class="currency">${formatoMonetario(f.valores.neto)}</td>
            <td class="currency">${formatoMonetario(f.valores.iva)}</td>
            <td class="currency">${formatoMonetario(f.valores.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="8">TOTAL</td>
          <td class="currency">${formatoMonetario(totalFacturado)}</td>
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

const selectPeriodo = document.getElementById('filtroPeriodo');
const periodoSeleccionado = selectPeriodo ? selectPeriodo.value : null;

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

    const valorHoraBase = parseFloat(fact.valores.hora || 0);
    const porcentajeAumento = parseFloat(fact.valores.aumento || 0) / 100;

    const valorAumentado = valorHoraBase * (1 + porcentajeAumento);
    // Usamos toFixed(2) y parseFloat para asegurar precisión monetaria
    const valorHoraAumentado = parseFloat(valorAumentado.toFixed(2));


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
        <td class="currency">${fact.valores.aumento ?? 0}%</td>
        <td class="currency">${valorHoraAumentado ? formatoMonetario(valorHoraAumentado) : '0.00'}</td>
        <td class="currency">${formatoMonetario(fact.valores.neto ?? 0)}</td>
        <td class="currency">${formatoMonetario(fact.valores.iva ?? 0)}</td>
        <td class="currency">${formatoMonetario(fact.valores.total)}</td>
      </tr>
    `;
  }));

  // 3. Calcular totales
  const totalFacturado = facturaciones.reduce((sum, f) => sum + (f.valores?.total || 0), 0);
  const totalNeto = facturaciones.reduce((sum, f) => sum + (f.valores?.neto || 0), 0);
  const totalIVA = facturaciones.reduce((sum, f) => sum + (f.valores?.iva || 0), 0);

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
          <th>Aumento</th>
          <th>Valor H. Aum.</th>
          <th>Neto</th>
          <th>IVA</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="9">TOTALES</td>
          <td class="currency">${formatoMonetario(totalNeto)}</td>
          <td class="currency">${formatoMonetario(totalIVA)}</td>
          <td class="currency">${formatoMonetario(totalFacturado)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

mostrarGastosInternosPorPeriodo(periodoSeleccionado);
mostrarInsumosPorPeriodo(periodoSeleccionado);


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
            <td colspan="7"><strong>TOTAL DE GASTOS</strong></td>
            <td><strong>$${totalGastos.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      `;

      const contenedor = document.getElementById(contenedorDestinoId);
      contenedor.appendChild(document.createElement('hr'));

      const subtitulo = document.createElement('h3');
      subtitulo.textContent = `🧾 Gastos Internos del período ${periodo}`;
      contenedor.appendChild(subtitulo);
      contenedor.appendChild(tabla);

      // Resultado neto (solo si hay facturación)
      const totalFacturadoElement = document.getElementById('totalFacturadoPeriodo');
      const totalFacturado = totalFacturadoElement
        ? parseFloat(totalFacturadoElement.dataset.total || 0)
        : 0;

      if (totalFacturado > 0) {
        const diferencia = totalFacturado - totalGastos;

        if (!document.getElementById('resultadoNetoGlobal')) {
          const resultado = document.createElement('p');
          resultado.id = 'resultadoNetoGlobal';
          resultado.innerHTML = `<strong>💼 Resultado Neto: $${diferencia.toFixed(2)}</strong>`;
          resultado.style.marginTop = '1em';
          resultado.style.fontSize = '1.2em';
          contenedor.appendChild(resultado);
        }
      }

      // ✅ SIEMPRE AL FINAL DEL RENDER COMPLETO
      mostrarBotonesExportacion();
    })
    .catch(err => console.error('Error al cargar gastosInternos.json:', err));
}

function mostrarGastosInternosPorServicio(servicio, contenedorDestinoId = "resultadoReporte") {
  fetch("gastosInternos.json")
    .then(res => res.json())
    .then(gastos => {
      const gastosServicio = gastos.filter(
        g => g.servicio?.toLowerCase() === servicio.toLowerCase()
      );

      if (gastosServicio.length === 0) return;

      const totalGastos = gastosServicio.reduce(
        (sum, g) => sum + parseFloat(g.total || 0),
        0
      );

      const contenedor = document.getElementById(contenedorDestinoId);

      const tablaHTML = `
        <hr>
        <h3>🧾 Gastos Internos del Servicio: ${servicio}</h3>
        <table class="reporte-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Sector</th>
              <th>Hs Trabajadas</th>
              <th>Hs Liquidadas</th>
              <th>Valor Hora</th>
              <th>Aumento</th>
              <th>Neto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${gastosServicio.map(g => `
              <tr>
                <td>${formatMonth(g.periodo)}</td>
                <td>${g.sector || "-"}</td>
                <td class="number">${g.hsTrabajadas ?? 0}</td>
                <td class="number">${g.hsLiquidadas ?? 0}</td>
                <td class="currency">${formatoMonetario(g.valorHora)}</td>
                <td class="number">${g.aumento ?? 0}%</td>
                <td class="currency">${formatoMonetario(g.neto)}</td>
                <td class="currency">${formatoMonetario(g.total)}</td>
              </tr>
            `).join("")}

            <tr class="total-row">
              <td colspan="7">TOTAL GASTOS</td>
              <td class="currency">${formatoMonetario(totalGastos)}</td>
            </tr>
          </tbody>
        </table>
      `;

      contenedor.insertAdjacentHTML("beforeend", tablaHTML);
    })
    .catch(err =>
      console.error("Error al cargar gastos internos por servicio:", err)
    );
}


function mostrarBotonesExportacion() {
  const botones = document.querySelector('.export-buttons');
  const contenedor = document.getElementById('div3');

  if (!botones || !contenedor) return;

  contenedor.appendChild(botones); // 👈 mueve el nodo
  botones.style.display = 'flex';
}

function mostrarInsumosPorPeriodo(periodo, contenedorDestinoId = 'div3') {
  fetch('insumos.json')
    .then(res => res.json())
    .then(insumos => {
      const insumosPeriodo = insumos.filter(i => i.fecha?.slice(0, 7) === periodo);
      const totalInsumos = insumosPeriodo.reduce((sum, i) => sum + (i.total || 0), 0);

      const tabla = document.createElement('table');
      tabla.className = 'styled-table tabla-insumos';
      tabla.innerHTML = `
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Tipo de Factura</th>
            <th>N° Factura</th>
            <th>Total ($)</th>
          </tr>
        </thead>
        <tbody>
          ${insumosPeriodo.map(i => `
            <tr>
              <td>${i.fecha || '-'}</td>
              <td>${i.cliente || '-'}</td>
              <td>${i.tipo || '-'}</td>
              <td>${i.numero || '-'}</td>
              <td><strong>$${i.total?.toFixed(2) || '0.00'}</strong></td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>TOTAL INSUMOS</strong></td>
            <td><strong>$${totalInsumos.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      `;

      const contenedor = document.getElementById(contenedorDestinoId);
      contenedor.appendChild(document.createElement('hr'));
      const subtitulo = document.createElement('h3');
      subtitulo.textContent = `🧂 Insumos facturados en el período ${periodo}`;
      contenedor.appendChild(subtitulo);
      contenedor.appendChild(tabla);
    })
    .catch(err => {
      console.error('Error al cargar insumos.json:', err);
    });
}

async function mostrarInsumosPorCliente(cliente) {
  try {
    const facturas = await ipcRenderer.invoke(
      'get-insumos-por-cliente',
      cliente
    );

    if (!facturas || facturas.length === 0) return;

    const contenedor = document.getElementById("resultadoReporte");

    let totalGeneral = 0;

    const tablaHTML = `
      <h4>Insumos facturados</h4>
      <table class="reporte-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Factura</th>
            <th>Tipo</th>
            <th>Detalle</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${facturas.map(f => {
      totalGeneral += f.total;

      return `
              <tr>
                <td>${formatearFecha(f.fecha)}</td>
                <td>${f.numero}</td>
                <td>${f.tipo}</td>
                <td>
                  <ul>
                    ${f.items.map(i => `
                      <li>
                        ${i.nombre} — ${i.cantidad} × ${formatoMonetario(i.precio)}
                      </li>
                    `).join("")}
                  </ul>
                </td>
                <td class="currency">${formatoMonetario(f.total)}</td>
              </tr>
            `;
    }).join("")}

          <tr class="total-row">
            <td colspan="4">TOTAL INSUMOS</td>
            <td class="currency">${formatoMonetario(totalGeneral)}</td>
          </tr>
        </tbody>
      </table>
    `;

    contenedor.insertAdjacentHTML("beforeend", tablaHTML);

  } catch (error) {
    console.error("Error al mostrar insumos por cliente:", error);
  }
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

function limpiarFiltros() {
  filtroPeriodoSeleccionado = null;
  filtroClienteSeleccionado = null;
  filtroServicioSeleccionado = null;
  filtroFacturanteSeleccionado = null;

  // limpiar inputs
  document.getElementById("filtroPeriodo").value = "";
  document.getElementById("filtroCliente").value = "";
  document.getElementById("filtroServicio").value = "";
  document.getElementById("filtroFacturante").value = "";

  limpiarPantallaReportes();
}


function mostrarFacturacionesPorServicio() {
  // Aquí va tu lógica real de facturaciones por servicios
  const resultado = document.getElementById("resultadoReporte");
  resultado.innerHTML = '<p>Tabla inicial de facturaciones por servicios</p>';
}

function mostrarInsumosIniciales() {
  // Aquí va tu lógica real de insumos
  const resultado = document.getElementById("resultadoReporte");
  resultado.innerHTML += '<p>Tabla inicial de insumos</p>';
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
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const fechaHoy = new Date().toLocaleDateString();
    const tablas = document.querySelectorAll(".reporte-table");

    if (!tablas.length) {
      mostrarNotificacion(
        "No hay datos para exportar. Genere un reporte primero.",
        "error"
      );
      return;
    }

    const tituloReporte = obtenerTituloReporte();
    const logoData = await cargarImagenComoBase64("assets/logorrss.jpg");

    /* ================= ENCABEZADO (SOLO 1° HOJA) ================= */

    doc.addImage(logoData, "JPEG", 10, 10, 20, 20);
    doc.setFontSize(16);
    doc.text("Reporte de Facturación", 35, 20);
    doc.setFontSize(12);
    doc.text(tituloReporte, 35, 28);
    doc.setFontSize(10);
    doc.text(`Generado el: ${fechaHoy}`, 10, 35);

    let currentY = tituloReporte.length > 40 ? 45 : 40;

    /* ================= TABLAS ================= */

    for (const tabla of tablas) {
      const encabezados = Array.from(
        tabla.querySelectorAll("thead th")
      ).map(th => th.textContent.trim());

      const filas = Array.from(
  tabla.querySelectorAll("tbody tr")
).map(tr =>
  Array.from(tr.querySelectorAll("td")).map(td =>
    td.textContent.trim()
  )
);

// ================= TOTAL FACTURADO =================

// Índice de la columna de importe (última columna)
const indexImporte = encabezados.length - 1;

const totalFacturado = filas.reduce((acc, fila) => {
  const valor = fila[indexImporte]
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = parseFloat(valor);
  return acc + (isNaN(numero) ? 0 : numero);
}, 0);

// Fila TOTAL
const filaTotal = Array(encabezados.length).fill("");
filaTotal[0] = "TOTAL";
filaTotal[indexImporte] = `$ ${totalFacturado.toLocaleString("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

filas.push(filaTotal);

      if (!encabezados.length || !filas.length) continue;

      doc.autoTable({
        head: [encabezados],
        body: filas,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [255, 140, 74] },
        styles: {
          fontSize: 10,
          cellPadding: 3
        }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    }

    /* ================= EXPORTAR ================= */

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte_facturacion.pdf";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      mostrarNotificacion("PDF guardado con éxito", "success");
    }, 500);

  } catch (error) {
    console.error("Error al exportar a PDF:", error);
    mostrarNotificacion(
      "Ocurrió un error al generar el PDF",
      "error"
    );
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


function obtenerTituloReporte(filtros = filtrosAplicados || obtenerValoresFiltros()) {
  const filtroPrincipal = determinarFiltroPrincipal(filtros);

  switch (filtroPrincipal) {
    case 'cliente':
      return `Filtrado por Cliente: ${filtros.cliente}`;

    case 'servicio':
      return `Filtrado por Servicio: ${filtros.servicio}`;

    case 'facturante':
      return `Filtrado por Facturante: ${filtros.facturante}`;

    case 'periodo':
      return `Filtrado por Período: ${formatMonth(filtros.periodo)}`;

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
// ---------------------------
// Función para cargar imagen
// ---------------------------
async function cargarImagen(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la imagen");
  return await response.arrayBuffer();
}

// ---------------------------
// Función principal exportar Word
// ---------------------------
async function exportarWord() {
  try {
    const contenedor = document.getElementById("resultadoReporte");
    if (!contenedor || !contenedor.innerText.trim()) {
      mostrarNotificacion("No hay datos para exportar", "error");
      return;
    }

    // Cargar logo como ArrayBuffer
    const logoBuffer = await cargarImagen("assets/logorrss.jpg");

    // Construir todos los elementos antes de crear el documento
    const children = [];

    // Encabezado con logo + título
    const logoImageRun = new ImageRun({
      data: logoBuffer,
      transformation: { width: 80, height: 80 },
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 12, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [logoImageRun] })],
              }),
              new TableCell({
                width: { size: 88, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    text: "Reporte de Facturación",
                    heading: HeadingLevel.HEADING_2,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    children.push(new Paragraph("")); // espaciado

    // Procesar nodos del contenedor
    const nodos = Array.from(contenedor.childNodes);

    for (const nodo of nodos) {
      if (nodo.nodeType === Node.ELEMENT_NODE && /^H[1-6]$/.test(nodo.tagName)) {
        children.push(
          new Paragraph({
            text: nodo.innerText,
            heading: HeadingLevel.HEADING_3,
          })
        );
        continue;
      }

      if (nodo.nodeType === Node.ELEMENT_NODE && nodo.tagName === "P") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: nodo.innerText,
                bold: nodo.innerText.toLowerCase().includes("total"),
                size: 20,
              }),
            ],
          })
        );
        continue;
      }

      if (nodo.nodeType === Node.ELEMENT_NODE && nodo.tagName === "TABLE") {
        const filas = [];

        const ths = nodo.querySelectorAll("thead th");
        if (ths.length) {
          filas.push(
            new TableRow({
              children: Array.from(ths).map(th =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: th.innerText, bold: true, size: 20 }),
                      ],
                    }),
                  ],
                })
              ),
            })
          );
        }

        const trs = nodo.querySelectorAll("tbody tr");
        trs.forEach(tr => {
          filas.push(
            new TableRow({
              children: Array.from(tr.querySelectorAll("td")).map(td =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: td.innerText, size: 20 })],
                    }),
                  ],
                })
              ),
            })
          );
        });

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: filas,
          })
        );

        children.push(new Paragraph(""));
      }
    }

    // Crear documento pasando children completo
    const doc = new Document({
      sections: [
        {
          properties: {
            type: SectionType.CONTINUOUS,
            page: {
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
              size: { orientation: "landscape" },
            },
          },
          children: children,
        },
      ],
    });

    // Generar Word y descargar
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reporte_facturacion.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacion("Word generado con éxito", "success");

  } catch (error) {
    console.error("Error al exportar Word:", error);
    mostrarNotificacion("Error al generar Word", "error");
  }
}


const limitesMensuales = {
  "Felipe Nogales": 4441534.77,
  "Aylen Nogales": 2447891.32,
  "Maximiliano Nogales": 1953265.86,
  "Sandra Cordoba": 2447891.32,
  "Omar Nogales": 651088.62
  // SAS y los demás no tienen límite
};

function obtenerNombreArchivoReporte() {
  if (filtroPeriodoSeleccionado) {
    return `Reporte_facturacion (${filtroPeriodoSeleccionado})`;
  }
  if (filtroClienteSeleccionado) {
    return `Reporte_facturacion (${filtroClienteSeleccionado})`;
  }
  if (filtroServicioSeleccionado) {
    return `Reporte_facturacion (${filtroServicioSeleccionado})`;
  }
  if (filtroFacturanteSeleccionado) {
    return `Reporte_facturacion (${filtroFacturanteSeleccionado})`;
  }
  return "Reporte_facturacion";
}

const parseNumero = (valor) => {
  if (valor == null) return null;

  let s = valor.toString().trim();
  const esPorcentaje = s.includes("%");

  s = s.replace("%", "");

  // 👉 SOLO si tiene coma, es formato AR
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  s = s.replace(/[^0-9.-]/g, "");
  if (s === "" || isNaN(s)) return null;

  let n = Number(s);

  // 👉 porcentaje Excel necesita 0.xx
  if (esPorcentaje) n = n / 100;

  return n;
};

async function exportarExcel() {
  try {
    const continuar = confirm(
      "Se generará un archivo Excel y se guardará en la carpeta Descargas.\n\n" +
      "⚠️ Advertencia:\n" +
      "Este reporte se encuentra en desarrollo y puede contener errores en los valores o formatos.\n\n" +
      "¿Desea continuar?"
    );

    if (!continuar) return;

    const contenedor = document.getElementById("resultadoReporte");
    if (!contenedor) return;

    const tabla = contenedor.querySelector("table");
    if (!tabla) return;

    const workbook = XLSX.utils.table_to_book(tabla, {
      raw: false
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const columnasHoras = [3, 4, 5];
    const columnaPorcentaje = 7;
    const columnasMoneda = [6, 8, 9, 10, 11];

    const parseNumero = (valor) => {
      if (!valor) return null;

      let s = valor.toString().trim();
      const esPorcentaje = s.includes("%");

      s = s.replace("%", "");

      if (s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
      }

      s = s.replace(/[^0-9.-]/g, "");
      if (s === "" || isNaN(s)) return null;

      let n = Number(s);
      if (esPorcentaje) n /= 100;

      return n;
    };

    for (const addr in sheet) {
      if (addr[0] === "!") continue;

      const cell = sheet[addr];
      if (!cell || !cell.w) continue;

      const col = XLSX.utils.decode_cell(addr).c;
      const num = parseNumero(cell.w);
      if (num === null) continue;

      if (columnasHoras.includes(col)) {
        cell.t = "n";
        cell.v = Math.round(num);
        cell.z = "0";
        continue;
      }

      if (col === columnaPorcentaje) {
        cell.t = "n";
        cell.v = num;
        cell.z = "0,00%";
        continue;
      }

      if (columnasMoneda.includes(col)) {
        cell.t = "n";
        cell.v = Math.round(num * 100) / 100;
        cell.z = "#.##0,00";
      }
    }

    const nombre = "reporte_facturacion";
    const ruta = `${os.homedir()}/Downloads/${nombre}.xlsx`;

    XLSX.writeFile(workbook, ruta, {
      bookType: "xlsx",
      compression: true,
    });

    alert(
      "Archivo Excel generado correctamente.\n\n" +
      "Ubicación:\n" +
      "Carpeta Descargas\n\n" +
      "ℹ️ Recuerde que este reporte está en desarrollo y puede contener inconsistencias."
    );

  } catch (e) {
    console.error("Error exportando Excel:", e);
    alert(
      "Ocurrió un error al generar el archivo Excel.\n\n" +
      "El reporte se encuentra en desarrollo."
    );
  }
}



// Si necesitas acceder a los datos, aquí hay una función de ejemplo
function obtenerDatosReporte() {
  // Esta función debería devolver los datos que ya tienes en memoria
  // Por ejemplo, si los datos están en una variable global o en el DOM

  // Opción 1: Buscar en window
  if (window.datosFacturacion) {
    return window.datosFacturacion;
  }

  // Opción 2: Buscar en el DOM (si tienes un script con los datos)
  const scriptElement = document.querySelector('script[data-facturacion]');
  if (scriptElement && scriptElement.textContent) {
    try {
      return JSON.parse(scriptElement.textContent);
    } catch (e) {
      console.error("Error parseando datos del DOM:", e);
    }
  }

  // Opción 3: Extraer de la tabla HTML (como última opción)
  const contenedor = document.getElementById("resultadoReporte");
  if (!contenedor) return [];

  const tabla = contenedor.querySelector("table");
  if (!tabla) return [];

  const datos = [];
  const filas = tabla.querySelectorAll("tbody tr");

  filas.forEach(fila => {
    const celdas = fila.querySelectorAll("td");
    if (celdas.length >= 11) {
      // Aquí debes mapear las celdas a la estructura de datos
      // Esto dependerá de cómo esté estructurada tu tabla
      const dato = {
        cuit: celdas[0].textContent.trim(),
        cliente: celdas[1].textContent.trim(),
        servicio: celdas[2].textContent.trim(),
        horas: {
          trabajadas: parseInt(celdas[3].textContent) || 0,
          mes: parseInt(celdas[4].textContent) || 0,
          liquidadas: parseInt(celdas[5].textContent) || 0
        },
        valores: {
          hora: celdas[6].textContent.trim(),
          horaAumentada: celdas[8].textContent.trim(),
          neto: parseFloat(celdas[9].textContent.replace(/\./g, '').replace(',', '.')) || 0,
          iva: parseFloat(celdas[10].textContent.replace(/\./g, '').replace(',', '.')) || 0,
          total: parseFloat(celdas[11].textContent.replace(/\./g, '').replace(',', '.')) || 0
        },
        aumentoAplicado: {
          porcentaje: parseFloat(celdas[7].textContent.replace('%', '').replace(',', '.')) || 0
        }
      };
      datos.push(dato);
    }
  });

  return datos;
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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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