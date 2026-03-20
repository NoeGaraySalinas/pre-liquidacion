const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// ============================================
// CONSTANTES GLOBALES (ÚNICA FUENTE DE VERDAD)
// ============================================
const ARCHIVOS_JSON = [
  'clientes.json',
  'servicios.json',
  'facturantes.json',
  'facturacion.json',
  'gastosInternos.json',
  'insumos.json',
  'aumentos.json'
];

// ============================================
// DETECCIÓN DE ENTORNO (SIMPLIFICADA)
// ============================================
const isDevelopment = !app.isPackaged;  // ✅ MÁS CONFIABLE

console.log('📦 CONFIGURACIÓN DE EMPAQUETADO:');
console.log('- app.isPackaged:', app.isPackaged);
console.log('- isDevelopment:', isDevelopment);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- __dirname:', __dirname);

// ============================================
// CONFIGURACIÓN DE RUTAS INTELIGENTE
// ============================================
function getDataFilePath(filename) {
  if (isDevelopment) {
    // DESARROLLO: Carpeta del proyecto
    return path.join(__dirname, filename);
  } else {
    // PRODUCCIÓN: AppData del usuario
    const userDataPath = app.getPath('userData');
    const appDataDir = path.join(userDataPath, 'app-data');
    
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }
    
    return path.join(appDataDir, filename);
  }
}

// ============================================
// INICIALIZACIÓN DE ARCHIVOS EN PRODUCCIÓN
// ============================================
function initializeProductionFiles() {
  if (isDevelopment) return;
  
  console.log('📁 Inicializando archivos en producción...');
  
  const appDataDir = path.join(app.getPath('userData'), 'app-data');
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  
  // ✅ USAMOS LA CONSTANTE GLOBAL
  ARCHIVOS_JSON.forEach(filename => {
    const destino = path.join(appDataDir, filename);
    
    if (!fs.existsSync(destino)) {
      // 1. Intentar desde unpacked (si tenemos JSON de ejemplo)
      const origen = path.join(process.resourcesPath, 'app.asar.unpacked', filename);
      if (fs.existsSync(origen)) {
        fs.copyFileSync(origen, destino);
        console.log(`  📋 Copiado ${filename} desde recursos`);
      } else {
        // 2. Crear archivo vacío
        fs.writeFileSync(destino, '[]', 'utf8');
        console.log(`  📄 Creado ${filename} vacío`);
      }
    }
  });
  
  // ✅ DEBUG: Mostrar archivos en AppData
  if (fs.existsSync(appDataDir)) {
    const files = fs.readdirSync(appDataDir);
    console.log('📁 Archivos en AppData:', files);
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function leerJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
    return [];
  }
}

function escribirJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error escribiendo ${filePath}:`, error.message);
    return false;
  }
}

// ============================================
// FUNCIONES ESPECÍFICAS POR ARCHIVO
// ============================================
function leerClientes() { return leerJSON(getDataFilePath('clientes.json')); }
function guardarClientes(data) { return escribirJSON(getDataFilePath('clientes.json'), data); }

function leerServicios() { return leerJSON(getDataFilePath('servicios.json')); }
function guardarServicios(data) { return escribirJSON(getDataFilePath('servicios.json'), data); }

function leerFacturantes() { return leerJSON(getDataFilePath('facturantes.json')); }
function guardarFacturantes(data) { return escribirJSON(getDataFilePath('facturantes.json'), data); }

function leerFacturaciones() { return leerJSON(getDataFilePath('facturacion.json')); }
function guardarFacturaciones(data) { return escribirJSON(getDataFilePath('facturacion.json'), data); }

function leerGastosInternos() { return leerJSON(getDataFilePath('gastosInternos.json')); }
function guardarGastosInternos(data) { return escribirJSON(getDataFilePath('gastosInternos.json'), data); }

function leerInsumos() { return leerJSON(getDataFilePath('insumos.json')); }
function guardarInsumos(data) { return escribirJSON(getDataFilePath('insumos.json'), data); }

function leerAumentos() { return leerJSON(getDataFilePath('aumentos.json')); }
function guardarAumentos(data) { return escribirJSON(getDataFilePath('aumentos.json'), data); }

// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================
const { prepararArchivosDeDatos } = require("./dataFiles");
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Si el usuario intenta abrir otra vez, no hacemos nada
  });
}

let mainWindow;

// ============================================
// HANDLERS IPC - CLIENTES
// ============================================
ipcMain.handle('get-clientes', () => {
  return leerClientes();
});

ipcMain.on('cargar-contenido', (event, archivo) => {
  const filePath = getDataFilePath(archivo);
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error("Error al leer el archivo:", err);
    } else {
      mainWindow.webContents.send('incluir-contenido', data);
    }
  });
});

ipcMain.on("get-clients", (event) => {
  event.sender.send("clients-data", leerClientes());
});

ipcMain.on('gestionar-clientes', () => {
  mainWindow.loadFile('gestion-clientes.html');
});

ipcMain.on("save-client", (event, nuevoCliente) => {
  let clientes = leerClientes();
  clientes.push(nuevoCliente);
  guardarClientes(clientes);
});

ipcMain.on("update-client", (event, updatedClient) => {
  let clientes = leerClientes();
  const clienteIndex = clientes.findIndex(cliente => cliente.cuit === updatedClient.cuit);

  if (clienteIndex !== -1) {
    clientes[clienteIndex] = updatedClient;
    guardarClientes(clientes);
  }

  event.reply("clients-data", clientes);
});

ipcMain.on("delete-client", (event, cuit) => {
  let clientes = leerClientes();
  const nuevoClientes = clientes.filter(cliente => cliente.cuit !== cuit);
  guardarClientes(nuevoClientes);
  event.sender.send("clients-data", nuevoClientes);
});

ipcMain.on('obtener-clientes-lista', (event) => {
  fs.readFile(getDataFilePath('clientes.json'), 'utf-8', (err, data) => {
    if (err) {
      console.error("Error al leer clientes.json:", err);
      return;
    }
    const clientes = JSON.parse(data);
    event.sender.send("clientes-data", clientes);
  });
});

// ============================================
// HANDLERS IPC - SERVICIOS
// ============================================
ipcMain.on("guardar-servicio", (event, servicio) => {
  try {
    let servicios = leerServicios();
    servicio.id = Date.now();
    servicios.push(servicio);
    guardarServicios(servicios);
    event.reply("servicio-guardado");
  } catch (err) {
    console.error("Error guardando servicio:", err);
    event.reply("error-servicio", "No se pudo guardar el servicio.");
  }
});

ipcMain.handle('get-servicios', async () => {
  return leerServicios();
});

ipcMain.on("actualizar-servicio", (event, servicioEditado) => {
  try {
    let servicios = leerServicios();
    const index = servicios.findIndex(s => s.id.toString() === servicioEditado.id.toString());

    if (index === -1) {
      return event.reply("error-servicio", "Servicio no encontrado");
    }

    servicios[index] = servicioEditado;
    guardarServicios(servicios);
    event.reply("servicio-actualizado");
  } catch (err) {
    console.error("Error actualizando servicio:", err);
    event.reply("error-servicio", "Error al actualizar servicio");
  }
});

ipcMain.on("eliminar-servicio", (event, servicioId) => {
  try {
    let servicios = leerServicios();
    const nuevosServicios = servicios.filter(s => s.id.toString() !== servicioId.toString());

    if (nuevosServicios.length === servicios.length) {
      return event.reply("error-servicio", "Servicio no encontrado");
    }

    guardarServicios(nuevosServicios);
    event.reply("servicio-eliminado");
  } catch (err) {
    console.error("Error eliminando servicio:", err);
    event.reply("error-servicio", "Error al eliminar servicio");
  }
});

// ============================================
// HANDLERS IPC - FACTURANTES
// ============================================
ipcMain.on("guardar-facturante", (event, facturante) => {
  console.log("Recibido en main.js:", facturante);
  let facturantes = leerFacturantes();
  facturante.id = Date.now();
  facturantes.push(facturante);
  guardarFacturantes(facturantes);
  event.reply("facturante-guardado");
});

ipcMain.on("obtener-facturantes", (event) => {
  event.reply("facturantes-data", leerFacturantes());
});

ipcMain.on("actualizar-facturante", (event, actualizado) => {
  let facturantes = leerFacturantes();
  const index = facturantes.findIndex(f => f.id === actualizado.id);
  
  if (index !== -1) {
    facturantes[index] = actualizado;
    guardarFacturantes(facturantes);
    event.reply("facturante-actualizado");
  }
});

ipcMain.on("eliminar-facturante", (event, facturanteId) => {
  let facturantes = leerFacturantes();
  facturantes = facturantes.filter((f) => f.id !== parseInt(facturanteId, 10));
  guardarFacturantes(facturantes);
  event.reply("facturante-eliminado");
});

ipcMain.handle('get-facturantes', () => {
  return leerFacturantes();
});

// ============================================
// HANDLERS IPC - FACTURACIÓN
// ============================================
ipcMain.handle('guardar-facturacion', async (event, nuevaFacturacion) => {
  try {
    let facturaciones = leerFacturaciones();

    if (!Array.isArray(facturaciones)) {
      throw new Error('El archivo no contiene un array válido');
    }

    const index = facturaciones.findIndex(f => f.id === nuevaFacturacion.id);

    if (index >= 0) {
      facturaciones[index] = nuevaFacturacion;
    } else {
      facturaciones.push(nuevaFacturacion);
    }

    guardarFacturaciones(facturaciones);
    return { success: true };
  } catch (error) {
    console.error('Error en el proceso de guardado:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('actualizar-facturacion', async (event, facturacionActualizada) => {
  try {
    let facturaciones = leerFacturaciones();

    console.log('🔄 Actualizando facturación:', {
      id: facturacionActualizada.id,
      totalFacturaciones: facturaciones.length
    });

    const index = facturaciones.findIndex(f => f.id == facturacionActualizada.id);

    if (index !== -1) {
      facturaciones[index] = {
        ...facturaciones[index],
        ...facturacionActualizada,
        fechaActualizacion: new Date().toISOString()
      };

      guardarFacturaciones(facturaciones);
      console.log('✅ Facturación actualizada correctamente');
      return { success: true };
    } else {
      console.error('❌ Facturación no encontrada para actualizar:', facturacionActualizada.id);
      return { success: false, error: 'Facturación no encontrada' };
    }
  } catch (error) {
    console.error('❌ Error actualizando facturación:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-facturacion', (event, { month = '', exactMatch = false } = {}) => {
  const facturaciones = leerFacturaciones();

  if (month) {
    return facturaciones.filter(f =>
      f.periodo && (exactMatch ?
        f.periodo === month :
        f.periodo.startsWith(month))
    );
  }

  return facturaciones;
});

ipcMain.handle('get-facturacion-data', async () => {
  return leerFacturaciones();
});

ipcMain.handle('eliminar-facturacion', async (event, id) => {
  try {
    let facturaciones = leerFacturaciones();
    const idToDelete = typeof id === 'string' ? parseInt(id, 10) : id;

    const nuevasFacturaciones = facturaciones.filter(f => {
      const factId = typeof f.id === 'string' ? parseInt(f.id, 10) : f.id;
      return factId !== idToDelete;
    });

    guardarFacturaciones(nuevasFacturaciones);
    event.sender.send('facturaciones-actualizadas');

    return {
      success: true,
      message: 'Facturación eliminada correctamente',
      deletedId: id
    };
  } catch (error) {
    console.error('Error en eliminar-facturacion:', error);
    return {
      success: false,
      error: 'Error al eliminar la facturación',
      details: error.message
    };
  }
});

// ============================================
// HANDLERS IPC - AUTOCOMPLETADO
// ============================================
ipcMain.handle('get-clientes-autocomplete', async () => {
  return leerClientes();
});

ipcMain.handle('get-servicios-autocomplete', async () => {
  return leerServicios();
});

ipcMain.handle('get-facturantes-autocomplete', async () => {
  return leerFacturantes();
});

// ============================================
// HANDLERS IPC - DIAGNÓSTICO
// ============================================
ipcMain.handle('diagnostico-archivo', async () => {
  try {
    const filePath = getDataFilePath('facturacion.json');
    const exists = fs.existsSync(filePath);
    const canWrite = (() => {
      try {
        fs.accessSync(path.dirname(filePath), fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    })();

    let content = '';
    if (exists) {
      content = fs.readFileSync(filePath, 'utf8');
    }

    return {
      exists,
      canWrite,
      path: filePath,
      content: exists ? content : 'El archivo no existe aún'
    };
  } catch (error) {
    return { error: error.message };
  }
});

// ============================================
// HANDLERS IPC - REPORTES
// ============================================
ipcMain.handle('get-facturacion-filtered', async (event, filtros) => {
  const facturaciones = leerFacturaciones();

  return facturaciones.filter(f => {
    return (!filtros.cliente || f.cliente === filtros.cliente) &&
      (!filtros.servicio || f.servicio === filtros.servicio) &&
      (!filtros.facturante || f.facturante === filtros.facturante) &&
      (!filtros.periodo || f.periodo === filtros.periodo);
  });
});

ipcMain.handle('get-downloads-path', () => {
  return app.getPath('downloads');
});

ipcMain.handle('obtener-datos-reporte', async (event, filtros) => {
  try {
    const facturaciones = leerFacturaciones();
    return facturaciones.filter(f => {
      return (!filtros.cliente || f.cliente === filtros.cliente) &&
        (!filtros.servicio || f.servicio === filtros.servicio) &&
        (!filtros.facturante || f.facturante === filtros.facturante) &&
        (!filtros.periodo || f.periodo === filtros.periodo);
    });
  } catch (error) {
    console.error("Error en main process:", error);
    return [];
  }
});

// ============================================
// HANDLERS IPC - GASTOS INTERNOS
// ============================================
ipcMain.handle('get-gastos-internos', async () => {
  try {
    const data = leerGastosInternos();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error al leer gastosInternos.json:', error);
    return [];
  }
});

// ============================================
// HANDLERS IPC - INSUMOS
// ============================================
ipcMain.handle('get-insumos', async () => {
  return leerInsumos();
});

ipcMain.handle('get-insumos-por-cliente', async (_, cliente) => {
  try {
    const insumos = leerInsumos();

    if (!cliente) return [];

    return insumos.filter(insumo =>
      insumo.cliente?.toLowerCase().trim() ===
      cliente.toLowerCase().trim()
    );
  } catch (error) {
    console.error("Error obteniendo insumos por cliente:", error);
    throw error;
  }
});

// ============================================
// HANDLERS IPC - SERVICIO POR NOMBRE
// ============================================
ipcMain.handle("get-servicio-por-nombre", async (_, nombreServicio) => {
  try {
    const servicios = leerServicios();
    const servicio = servicios.find(s => s.nombre === nombreServicio);
    return servicio || null;
  } catch (error) {
    console.error("Error obteniendo servicio por nombre:", error);
    return null;
  }
});

// ============================================
// HANDLERS IPC - AUMENTOS
// ============================================
ipcMain.handle("get-aumentos", async () => {
  return leerAumentos();
});

ipcMain.handle("guardar-aumento", async (event, aumento) => {
  let data = leerAumentos();
  data.push(aumento);
  guardarAumentos(data);
  return true;
});

ipcMain.handle("actualizar-aumento", async (event, aumentoEditado) => {
  let data = leerAumentos();
  data = data.map(a =>
    a.id.toString() === aumentoEditado.id.toString()
      ? { ...a, ...aumentoEditado }
      : a
  );
  guardarAumentos(data);
  return true;
});

ipcMain.handle("eliminar-aumento", async (event, id) => {
  let data = leerAumentos();
  data = data.filter(a => a.id.toString() !== id.toString());
  guardarAumentos(data);
  return true;
});

// ============================================
// HANDLER PARA ACTUALIZAR VALOR HORA
// ============================================
ipcMain.handle('actualizar-valor-hora-servicio', async (event, { nombre, nuevoValorHora, gremio, periodo }) => {
  try {
    let servicios = leerServicios();
    const servicioIndex = servicios.findIndex(s => s.nombre === nombre);
    
    if (servicioIndex !== -1) {
      servicios[servicioIndex].valorHora = nuevoValorHora;
      servicios[servicioIndex].ultimaActualizacion = new Date().toISOString();
      servicios[servicioIndex].periodoActualizacion = periodo;

      guardarServicios(servicios);
      return { success: true };
    }

    return { success: false, error: 'Servicio no encontrado' };
  } catch (error) {
    console.error('Error actualizando valor hora:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// HANDLERS PARA INFORMACIÓN DEL SISTEMA
// ============================================
ipcMain.handle('get-app-info', () => {
  return {
    isDevelopment,
    userDataPath: app.getPath('userData'),
    appDataDir: isDevelopment ? __dirname : path.join(app.getPath('userData'), 'app-data'),
    resourcesPath: process.resourcesPath,
    isPackaged: app.isPackaged
  };
});

ipcMain.handle('get-data-directory', () => {
  if (isDevelopment) {
    return __dirname;
  } else {
    return path.join(app.getPath('userData'), 'app-data');
  }
});

// ============================================
// CREACIÓN DE VENTANA
// ============================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
    }
  });

  mainWindow.loadFile('index.html');
  
  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }
}

// ============================================
// INICIALIZACIÓN DE LA APP (VERSIÓN FINAL)
// ============================================
app.whenReady().then(() => {
  console.log('🚀 Iniciando aplicación...');
  console.log('📁 Entorno:', isDevelopment ? 'DESARROLLO 🛠️' : 'PRODUCCIÓN 🚀');
  console.log('📁 __dirname:', __dirname);
  console.log('📁 userData:', app.getPath('userData'));
  console.log('📁 Directorio de datos:', getDataFilePath(''));
  
  // ✅ INICIALIZAR ARCHIVOS EN PRODUCCIÓN
  if (!isDevelopment) {
    initializeProductionFiles();
  }
  
  createWindow();
  
  if (typeof prepararArchivosDeDatos === 'function') {
    prepararArchivosDeDatos();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// EXPORTAR PARA PRUEBAS
// ============================================
module.exports = {
  getDataFilePath,
  isDevelopment,
  leerJSON,
  escribirJSON,
  leerClientes,
  guardarClientes,
  leerServicios,
  guardarServicios,
  leerFacturantes,
  guardarFacturantes,
  leerFacturaciones,
  guardarFacturaciones,
  leerGastosInternos,
  guardarGastosInternos,
  leerInsumos,
  guardarInsumos,
  leerAumentos,
  guardarAumentos,
  ARCHIVOS_JSON  // ✅ EXPORTADO POR SI LO NECESITÁS
};