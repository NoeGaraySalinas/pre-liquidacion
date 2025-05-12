const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuración inicial
const clientesPath = path.join(__dirname, 'clientes.json');

let mainWindow;

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

ipcMain.handle('get-servicios', async () => {
  try {
    const data = await fs.promises.readFile(path.join(__dirname, 'servicios.json'));
    return JSON.parse(data);
  } catch (error) {
    console.error("Error leyendo servicios.json:", error);
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

const serviciosFilePath = path.join(__dirname, 'servicios.json');

// Función para leer los servicios desde el archivo
function readServicios() {
  try {
    if (fs.existsSync(serviciosFilePath)) {
      const data = fs.readFileSync(serviciosFilePath, 'utf-8');
      return JSON.parse(data); // Retorna los servicios almacenados
    }
    return []; // Si el archivo no existe, retorna un array vacío
  } catch (err) {
    console.error("Error leyendo el archivo de servicios:", err);
    return []; // Si ocurre un error, retorna un array vacío
  }
}

// Función para escribir los servicios en el archivo
function writeServicios(servicios) {
  try {
    fs.writeFileSync(serviciosFilePath, JSON.stringify(servicios, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error escribiendo el archivo de servicios:", err);
  }
}

// Escuchar solicitud para guardar un servicio
ipcMain.on('guardar-servicio', (event, nuevoServicio) => {
  console.log("Datos recibidos para guardar servicio:", nuevoServicio);

  // Verificar si se está enviando la propiedad "descripcion" inesperadamente
  if ("descripcion" in nuevoServicio) {
    console.error("Error: Se recibió un dato inesperado 'descripcion' en el servicio.");
    event.reply('error-servicio', 'El servicio no debe contener el campo descripción.');
    return;
  }

  if (!nuevoServicio || !nuevoServicio.nombre) {
    console.error("Error: El servicio debe tener un nombre.");
    event.reply('error-servicio', 'El servicio debe tener un nombre.');
    return;
  }

  const servicios = readServicios();
  
  // Generar un ID único si no existe en el servicio
  nuevoServicio.id = Date.now();  

  servicios.push(nuevoServicio); // Agregar el nuevo servicio al array

  console.log("Servicios después de agregar:", servicios); // Depuración

  try {
    writeServicios(servicios); // Guardar los servicios en el archivo
    event.reply('servicio-guardado'); // Notificar que el servicio fue guardado
  } catch (error) {
    console.error("Error al guardar el servicio:", error);
    event.reply('error-servicio', 'Hubo un error al guardar el servicio.');
  }
});

// Escuchar solicitud para obtener los servicios
ipcMain.on('obtener-servicios', (event) => {
  const servicios = readServicios(); // Leer los servicios desde el archivo
  event.reply('servicios-data', servicios); // Enviar los servicios al renderer
});

// Eliminar un servicio por ID
ipcMain.on("eliminar-servicio", (event, servicioId) => {
  console.log("Intentando eliminar servicio con ID:", servicioId);

  let servicios = readServicios();
  const serviciosActualizados = servicios.filter(servicio => servicio.id !== parseInt(servicioId, 10));

  if (servicios.length === serviciosActualizados.length) {
    console.warn("⚠️ No se encontró el servicio a eliminar.");
  } else {
    console.log("✅ Servicio eliminado correctamente.");
    writeServicios(serviciosActualizados);
  }

  console.log("📂 Estado actual de servicios.json:", JSON.stringify(serviciosActualizados, null, 2));

  event.reply('servicio-eliminado');
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

// Handler principal con parámetro de tipo de búsqueda
ipcMain.handle('get-facturacion', (event, {month = '', exactMatch = false} = {}) => {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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
        return {id: factId, tipo: typeof factId};
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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