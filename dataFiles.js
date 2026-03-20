const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/* ===============================
   CARPETA SEGURA DE DATOS
   (fuera del asar)
================================ */

// Carpeta donde se guardan TODOS los JSON editables
const dataDir = path.join(app.getPath('userData'), 'data');

// Lista de TODOS tus JSON
const jsonFiles = [
  'clientes.json',
  'servicios.json',
  'facturacion.json',
  'facturantes.json',
  'facturas_insumos.json',
  'gastosInternos.json',
  'insumos.json',
  'aumentos.json'
];

/* ===============================
   PREPARAR ARCHIVOS DE DATOS
   (se ejecuta UNA vez al iniciar)
================================ */

function prepararArchivosDeDatos() {
  // Asegura la carpeta de datos
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Asegura cada JSON
  jsonFiles.forEach((file) => {
    const destino = path.join(dataDir, file);

    if (!fs.existsSync(destino)) {
      // En desarrollo toma el JSON base del proyecto
      // En producción, __dirname sigue siendo válido
      const origen = path.join(__dirname, file);

      if (fs.existsSync(origen)) {
        fs.copyFileSync(origen, destino);
      } else {
        // Fallback seguro: crea vacío si no existe base
        fs.writeFileSync(destino, JSON.stringify([], null, 2), 'utf8');
      }
    }
  });
}

/* ===============================
   OBTENER RUTA DE UN JSON
================================ */

function getJsonPath(nombreArchivo) {
  return path.join(dataDir, nombreArchivo);
}

/* ===============================
   EXPORTS
================================ */

module.exports = {
  dataDir,
  prepararArchivosDeDatos,
  getJsonPath
};
