const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuración inicial
const clientesPath = path.join(__dirname, 'clientes.json');
const FACTURANTES_PATH = path.join(__dirname, 'facturantes.json');

let mainWindow;



// main.js
ipcMain.handle('get-clientes', () => {
  const filePath = path.join(__dirname, 'clientes.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error("Error cargando clientes:", error);
    return [];
  }
});



// Clientes

ipcMain.on('cargar-contenido', (event, archivo) => {
  const filePath = path.join(__dirname, archivo);
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error("Error al leer el archivo:", err);
    } else {
      mainWindow.webContents.send('incluir-contenido', data);
    }
  });
});

ipcMain.on("get-clients", (event) => {
  if (fs.existsSync(clientesPath)) {
    const data = fs.readFileSync(clientesPath, "utf8");
    const clientes = JSON.parse(data);
    event.sender.send("clients-data", clientes);
  } else {
    event.sender.send("clients-data", []);
  }
});

ipcMain.on('gestionar-clientes', () => {
  mainWindow.loadFile('gestion-clientes.html');
});

ipcMain.on("save-client", (event, nuevoCliente) => {
  let clientes = [];

  if (fs.existsSync(clientesPath)) {
    try {
      const data = fs.readFileSync(clientesPath, "utf8");
      clientes = JSON.parse(data);
    } catch (error) {
      console.error("Error al leer clientes.json:", error);
      return;
    }
  }

  clientes.push(nuevoCliente);

  try {
    fs.writeFileSync(clientesPath, JSON.stringify(clientes, null, 2), "utf8");
  } catch (error) {
    console.error("Error al escribir en clientes.json:", error);
  }
});

ipcMain.on("update-client", (event, updatedClient) => {
  const clientes = JSON.parse(fs.readFileSync('clientes.json', 'utf-8'));
  const clienteIndex = clientes.findIndex(cliente => cliente.cuit === updatedClient.cuit);

  if (clienteIndex !== -1) {
    clientes[clienteIndex] = updatedClient;
    fs.writeFileSync('clientes.json', JSON.stringify(clientes, null, 2), 'utf-8');
  }

  event.reply("clients-data", clientes);
});

ipcMain.on("delete-client", (event, cuit) => {
  if (fs.existsSync(clientesPath)) {
    let clientes = JSON.parse(fs.readFileSync(clientesPath, "utf8"));
    const nuevoClientes = clientes.filter(cliente => cliente.cuit !== cuit);
    fs.writeFileSync(clientesPath, JSON.stringify(nuevoClientes, null, 2), "utf8");

    event.sender.send("clients-data", nuevoClientes);
  }
});



// Servicios

const serviciosPath = path.join(__dirname, "servicios.json");

// Guardar servicio nuevo
ipcMain.on("guardar-servicio", (event, servicio) => {
  try {
    let servicios = [];
    if (fs.existsSync(serviciosPath)) {
      const data = fs.readFileSync(serviciosPath, "utf8");
      servicios = JSON.parse(data);
    }

    // Asignar ID único simple
    servicio.id = Date.now();
    servicios.push(servicio);

    fs.writeFileSync(serviciosPath, JSON.stringify(servicios, null, 2));
    event.reply("servicio-guardado");
  } catch (err) {
    console.error("Error guardando servicio:", err);
    event.reply("error-servicio", "No se pudo guardar el servicio.");
  }
});

// Obtener servicios
ipcMain.handle('get-servicios', async () => {
  try {
    if (!fs.existsSync(serviciosPath)) return [];

    const data = await fs.promises.readFile(serviciosPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error en get-servicios:", error);
    return [];
  }
});

// Actualizar servicio
ipcMain.on("actualizar-servicio", (event, servicioEditado) => {
  try {
    if (!fs.existsSync(serviciosPath)) {
      return event.reply("error-servicio", "Archivo de servicios no existe");
    }

    const data = fs.readFileSync(serviciosPath, "utf-8");
    const servicios = JSON.parse(data);

    const index = servicios.findIndex(s => s.id.toString() === servicioEditado.id.toString());

    if (index === -1) {
      return event.reply("error-servicio", "Servicio no encontrado");
    }

    servicios[index] = servicioEditado;
    fs.writeFileSync(serviciosPath, JSON.stringify(servicios, null, 2));
    event.reply("servicio-actualizado");
  } catch (err) {
    console.error("Error actualizando servicio:", err);
    event.reply("error-servicio", "Error al actualizar servicio");
  }
});

// Eliminar servicio
ipcMain.on("eliminar-servicio", (event, servicioId) => {
  try {
    if (!fs.existsSync(serviciosPath)) {
      return event.reply("error-servicio", "Archivo de servicios no existe");
    }

    const data = fs.readFileSync(serviciosPath, "utf-8");
    const servicios = JSON.parse(data);

    const nuevosServicios = servicios.filter(s => s.id.toString() !== servicioId.toString());

    if (nuevosServicios.length === servicios.length) {
      return event.reply("error-servicio", "Servicio no encontrado");
    }

    fs.writeFileSync(serviciosPath, JSON.stringify(nuevosServicios, null, 2));
    event.reply("servicio-eliminado");
  } catch (err) {
    console.error("Error eliminando servicio:", err);
    event.reply("error-servicio", "Error al eliminar servicio");
  }
});



//Facturantes

const facturantesFile = path.join(__dirname, "facturantes.json");

// Cargar facturantes desde el archivo
function getFacturantes() {
  if (!fs.existsSync(facturantesFile)) return [];
  return JSON.parse(fs.readFileSync(facturantesFile, "utf-8"));
}

// Guardar facturantes en el archivo
function saveFacturantes(facturantes) {
  fs.writeFileSync(facturantesFile, JSON.stringify(facturantes, null, 2));
}

// Manejar evento de guardar facturante
ipcMain.on("guardar-facturante", (event, facturante) => {
  console.log("Recibido en main.js:", facturante); // Verificar si llega el dato
  const facturantes = getFacturantes();
  facturante.id = Date.now(); // Asignar un ID único
  facturantes.push(facturante);
  saveFacturantes(facturantes);
  event.reply("facturante-guardado");
});

// Manejar evento de obtener facturantes
ipcMain.on("obtener-facturantes", (event) => {
  event.reply("facturantes-data", getFacturantes());
});

ipcMain.on("actualizar-facturante", (event, actualizado) => {
  const facturantesPath = path.join(__dirname, "facturantes.json");
  let facturantes = [];

  if (fs.existsSync(facturantesPath)) {
    facturantes = JSON.parse(fs.readFileSync(facturantesPath, "utf-8"));
  }

  const index = facturantes.findIndex(f => f.id === actualizado.id);
  if (index !== -1) {
    facturantes[index] = actualizado;
    fs.writeFileSync(facturantesPath, JSON.stringify(facturantes, null, 2), "utf-8");
    event.reply("facturante-actualizado");
  }
});

// Manejar evento de eliminar facturante
ipcMain.on("eliminar-facturante", (event, facturanteId) => {
  let facturantes = getFacturantes();
  facturantes = facturantes.filter((f) => f.id !== parseInt(facturanteId, 10));
  saveFacturantes(facturantes);
  event.reply("facturante-eliminado");
});

ipcMain.on('obtener-clientes-lista', (event) => {
  const clientesPath = path.join(__dirname, 'clientes.json');
  fs.readFile(clientesPath, 'utf-8', (err, data) => {
    if (err) {
      console.error("Error al leer clientes.json:", err);
      return;
    }
    const clientes = JSON.parse(data);
    event.sender.send("clientes-data", clientes); // Enviar los datos de clientes al renderer
  });
});

ipcMain.on('actualizar-facturante', (event, datosActualizados) => {
  try {
    const raw = fs.readFileSync(FACTURANTES_PATH, 'utf-8');
    const facturantes = JSON.parse(raw);

    const index = facturantes.findIndex(f => f.id === datosActualizados.id);
    if (index === -1) {
      event.reply('error-facturante', 'No se encontró el facturante a actualizar.');
      return;
    }

    // Actualizamos los campos
    facturantes[index] = {
      ...facturantes[index],
      ...datosActualizados
    };

    fs.writeFileSync(FACTURANTES_PATH, JSON.stringify(facturantes, null, 2), 'utf-8');
    event.reply('facturante-actualizado');
  } catch (error) {
    console.error('Error al actualizar facturante:', error);
    event.reply('error-facturante', 'Ocurrió un error al actualizar el facturante.');
  }
});



//Facturacion

// Función para cargar facturaciones
function cargarFacturaciones() {
  try {
    if (!fs.existsSync(facturacionesPath)) {
      fs.writeFileSync(facturacionesPath, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(facturacionesPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar facturaciones:', error);
    return [];
  }
}

// Asegúrate de que la ruta sea absoluta
const facturacionesPath = path.join(__dirname, 'facturacion.json');

function guardarFacturaciones(facturaciones) {
  try {
    // Crear directorio si no existe
    const dir = path.dirname(facturacionesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Escribir el archivo con formato legible
    fs.writeFileSync(
      facturacionesPath,
      JSON.stringify(facturaciones, null, 2),
      'utf8'
    );

    console.log('Facturaciones guardadas correctamente en:', facturacionesPath);
    return true;
  } catch (error) {
    console.error('Error al guardar facturaciones:', error);
    throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  }
}

// Manejar el evento de guardado desde el renderer
ipcMain.handle('guardar-facturacion', async (event, nuevaFacturacion) => {
  try {
    let facturaciones = [];

    // Leer archivo existente si existe
    if (fs.existsSync(facturacionesPath)) {
      const data = fs.readFileSync(facturacionesPath, 'utf8');
      facturaciones = JSON.parse(data);

      // Verificar si es un array válido
      if (!Array.isArray(facturaciones)) {
        throw new Error('El archivo no contiene un array válido');
      }
    }

    // Buscar si ya existe una facturación con el mismo ID
    const index = facturaciones.findIndex(f => f.id === nuevaFacturacion.id);

    if (index >= 0) {
      // Actualizar existente
      facturaciones[index] = nuevaFacturacion;
    } else {
      // Agregar nueva
      facturaciones.push(nuevaFacturacion);
    }

    // Guardar los cambios
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

// Handler para actualizar facturación existente
ipcMain.handle('actualizar-facturacion', async (event, facturacionActualizada) => {
  try {
    const facturacionPath = path.join(__dirname, 'facturacion.json');

    // Leer facturaciones existentes
    let facturaciones = [];
    if (fs.existsSync(facturacionPath)) {
      const data = fs.readFileSync(facturacionPath, 'utf8');
      facturaciones = JSON.parse(data);
    }

    console.log('🔄 Actualizando facturación:', {
      id: facturacionActualizada.id,
      totalFacturaciones: facturaciones.length
    });

    // Buscar la facturación por ID
    const index = facturaciones.findIndex(f => f.id == facturacionActualizada.id);

    if (index !== -1) {
      // Actualizar la facturación existente
      facturaciones[index] = {
        ...facturaciones[index], // Mantener propiedades existentes
        ...facturacionActualizada, // Aplicar cambios
        fechaActualizacion: new Date().toISOString() // Agregar timestamp de actualización
      };

      // Guardar cambios
      fs.writeFileSync(facturacionPath, JSON.stringify(facturaciones, null, 2));

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

// Handler principal con parámetro de tipo de búsqueda
ipcMain.handle('get-facturacion', (event, { month = '', exactMatch = false } = {}) => {
  const facturaciones = cargarFacturaciones();

  if (month) {
    return facturaciones.filter(f =>
      f.periodo && (exactMatch ?
        f.periodo === month :
        f.periodo.startsWith(month))
    );
  }

  return facturaciones;
});

// Handlers para autocompletado (NUEVOS)
ipcMain.handle('get-clientes-autocomplete', async () => {
  return getJsonData('clientes');
});

ipcMain.handle('get-servicios-autocomplete', async () => {
  return getJsonData('servicios');
});

ipcMain.handle('get-facturantes-autocomplete', async () => {
  return getJsonData('facturantes');
});

ipcMain.handle('diagnostico-archivo', async () => {
  try {
    const exists = fs.existsSync(facturacionesPath);
    const canWrite = (() => {
      try {
        fs.accessSync(path.dirname(facturacionesPath), fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    })();

    let content = '';
    if (exists) {
      content = fs.readFileSync(facturacionesPath, 'utf8');
    }

    return {
      exists,
      canWrite,
      path: facturacionesPath,
      content: exists ? content : 'El archivo no existe aún'
    };
  } catch (error) {
    return { error: error.message };
  }
});

// Funciones auxiliares
async function getJsonData(fileType) {
  try {
    const filePath = path.join(__dirname, `${fileType}.json`);
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, JSON.stringify([]));
      return [];
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error al leer ${fileType}.json:`, error);
    return [];
  }
}

async function saveJsonData(fileType, data) {
  try {
    const filePath = path.join(__dirname, `${fileType}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error al guardar ${fileType}.json:`, error);
  }
}

function cargarFacturaciones() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'facturacion.json'));
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Handler mejorado para eliminar facturación
ipcMain.handle('eliminar-facturacion', async (event, id) => {
  try {
    const filePath = path.join(__dirname, 'facturacion.json');

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'El archivo facturacion.json no existe' };
    }

    // Leer datos actuales
    const facturaciones = await getJsonData('facturacion');

    // Convertir id a número si es string (para comparación consistente)
    const idToDelete = typeof id === 'string' ? parseInt(id, 10) : id;

    // Verificar si la facturación existe
    const factExistente = facturaciones.find(f => {
      // Asegurarse de comparar tipos iguales
      const factId = typeof f.id === 'string' ? parseInt(f.id, 10) : f.id;
      return factId === idToDelete;
    });

    if (!factExistente) {
      console.log('Facturación no encontrada. ID buscado:', idToDelete, 'Tipo:', typeof idToDelete);
      console.log('IDs existentes:', facturaciones.map(f => {
        const factId = typeof f.id === 'string' ? parseInt(f.id, 10) : f.id;
        return { id: factId, tipo: typeof factId };
      }));
      return { success: false, error: `Facturación con ID ${id} no encontrada` };
    }

    // Filtrar la facturación a eliminar
    const nuevasFacturaciones = facturaciones.filter(f => {
      const factId = typeof f.id === 'string' ? parseInt(f.id, 10) : f.id;
      return factId !== idToDelete;
    });

    // Guardar los cambios
    await saveJsonData('facturacion', nuevasFacturaciones);

    // Notificar a todos los clientes sobre la actualización
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

// Handler para obtener datos específicos de facturación
ipcMain.handle('get-facturacion-data', async () => {
  return await getJsonData('facturacion');
});

// Handler para obtener facturantes.json
ipcMain.handle('get-facturantes', () => {
  const filePath = path.join(__dirname, 'facturantes.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error al leer facturantes.json:", err);
    return [];
  }
});



// Reportes

ipcMain.handle('get-facturacion-filtered', async (event, filtros) => {
  const filePath = path.join(__dirname, 'facturacion.json');

  if (!fs.existsSync(filePath)) return [];

  const rawData = fs.readFileSync(filePath, 'utf8');
  let facturaciones = [];

  try {
    facturaciones = JSON.parse(rawData);
  } catch (e) {
    console.error('Error al parsear facturacion.json:', e);
    return [];
  }

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
    // Aquí va tu lógica para obtener datos de la base de datos
    return await database.obtenerDatosReporte(filtros);
  } catch (error) {
    console.error("Error en main process:", error);
    return [];
  }
});

ipcMain.handle('get-gastos-internos', async () => {
  try {
    const filePath = path.join(__dirname, 'gastosInternos.json');

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      console.warn('El archivo gastosInternos.json no existe');
      return [];
    }

    const data = await fs.promises.readFile(filePath, 'utf-8');

    // Manejar tanto array como objeto individual
    const parsedData = JSON.parse(data);
    return Array.isArray(parsedData) ? parsedData : [parsedData];

  } catch (error) {
    console.error('Error al leer gastosInternos.json:', error);
    return [];
  }
});



//Aumento

const rutaAumentos = path.join(__dirname, 'aumentos.json');

// Asegurar archivo
if (!fs.existsSync(rutaAumentos)) {
  fs.writeFileSync(rutaAumentos, '[]', 'utf8');
}

// Obtener aumentos
ipcMain.handle("get-aumentos", async () => {
  const data = JSON.parse(fs.readFileSync(rutaAumentos, "utf8"));
  return data;
});

// Guardar aumento nuevo
ipcMain.handle("guardar-aumento", async (event, aumento) => {
  const data = JSON.parse(fs.readFileSync(rutaAumentos, "utf8"));
  data.push(aumento);
  fs.writeFileSync(rutaAumentos, JSON.stringify(data, null, 2));
  return true;
});

// Actualizar aumento existente
ipcMain.handle("actualizar-aumento", async (event, aumentoEditado) => {
  let data = JSON.parse(fs.readFileSync(rutaAumentos, "utf8"));

  data = data.map(a =>
    a.id.toString() === aumentoEditado.id.toString()
      ? { ...a, ...aumentoEditado }
      : a
  );

  fs.writeFileSync(rutaAumentos, JSON.stringify(data, null, 2));
  return true;
});

// Eliminar aumento
ipcMain.handle("eliminar-aumento", async (event, id) => {
  let data = JSON.parse(fs.readFileSync(rutaAumentos, "utf8"));

  data = data.filter(a => a.id.toString() !== id.toString());

  fs.writeFileSync(rutaAumentos, JSON.stringify(data, null, 2));
  return true;
});


ipcMain.handle('actualizar-valor-hora-servicio', async (event, { nombre, nuevoValorHora, gremio, periodo }) => {
  try {
    const serviciosPath = path.join(__dirname, 'servicios.json');

    // Leer servicios existentes
    let servicios = [];
    if (fs.existsSync(serviciosPath)) {
      const data = await fs.promises.readFile(serviciosPath, 'utf8');
      servicios = JSON.parse(data);
    }

    // Encontrar y actualizar el servicio
    const servicioIndex = servicios.findIndex(s => s.nombre === nombre);
    if (servicioIndex !== -1) {
      servicios[servicioIndex].valorHora = nuevoValorHora;
      servicios[servicioIndex].ultimaActualizacion = new Date().toISOString();
      servicios[servicioIndex].periodoActualizacion = periodo;

      // Guardar cambios
      await fs.promises.writeFile(serviciosPath, JSON.stringify(servicios, null, 2));
      return { success: true };
    }

    return { success: false, error: 'Servicio no encontrado' };
  } catch (error) {
    console.error('Error actualizando valor hora:', error);
    return { success: false, error: error.message };
  }
});

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

  mainWindow.loadFile('index.html'); // Cargamos la ventana principal
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Carpeta donde se van a guardar los datos en producción
const dataDir = app.getPath("documents");
const archivos = ["clientes.json", "servicios.json", "facturacion.json"];

function inicializarArchivos() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  archivos.forEach(nombre => {
    const destino = path.join(dataDir, nombre);

    if (!fs.existsSync(destino)) {
      // 👇 ahora el origen lo tomamos desde la raíz del proyecto / asar
      const origen = path.join(process.resourcesPath, nombre);

      if (fs.existsSync(origen)) {
        fs.copyFileSync(origen, destino);
      } else {
        // fallback para cuando corrés en desarrollo
        const origenDev = path.join(__dirname, nombre);
        if (fs.existsSync(origenDev)) {
          fs.copyFileSync(origenDev, destino);
        } else {
          fs.writeFileSync(destino, "[]", "utf-8");
        }
      }
    }
  });
}