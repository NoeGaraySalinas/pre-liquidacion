const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/* ===============================
   RUTA SEGURA PARA DATOS
================================ */

// Ruta segura fuera del asar
const dataDir = app.getPath('userData');
const clientesFile = path.join(dataDir, 'clientes.json');

// LOG DESPUÉS de definirla
console.log('Clientes JSON:', clientesFile);

// Crear archivo si no existe
if (!fs.existsSync(clientesFile)) {
  fs.writeFileSync(clientesFile, JSON.stringify([], null, 2));
}

/* ===============================
   AGREGAR CLIENTE
================================ */

const agregarCliente = (
  nombre,
  alias,
  cuit,
  domicilioFisico,
  domicilioFacturacion,
  iva,
  condVenta,
  callback
) => {
  fs.readFile(clientesFile, 'utf8', (err, data) => {
    if (err) return callback(err);

    const clientes = JSON.parse(data);

    const nuevoCliente = {
      id: clientes.length ? Math.max(...clientes.map(c => c.id)) + 1 : 1,
      nombre,
      alias,
      cuit,
      domicilioFisico,
      domicilioFacturacion,
      iva,
      condVenta
    };

    clientes.push(nuevoCliente);

    fs.writeFile(
      clientesFile,
      JSON.stringify(clientes, null, 2),
      (err) => {
        if (err) return callback(err);
        callback(null, nuevoCliente.id);
      }
    );
  });
};

/* ===============================
   ACTUALIZAR CLIENTE
================================ */

function actualizarCliente(clienteEditado, callback) {
  fs.readFile(clientesFile, 'utf8', (err, data) => {
    if (err) return callback(err);

    let clientes = JSON.parse(data);
    const index = clientes.findIndex(c => c.id == clienteEditado.id);

    if (index === -1) {
      return callback(new Error('Cliente no encontrado'));
    }

    clientes[index] = clienteEditado;

    fs.writeFile(
      clientesFile,
      JSON.stringify(clientes, null, 2),
      (err) => {
        if (err) return callback(err);
        callback(null);
      }
    );
  });
}

/* ===============================
   BORRAR CLIENTE
================================ */

function borrarCliente(id, callback) {
  fs.readFile(clientesFile, 'utf8', (err, data) => {
    if (err) return callback(err);

    let clientes = JSON.parse(data);
    clientes = clientes.filter(c => c.id != id);

    fs.writeFile(
      clientesFile,
      JSON.stringify(clientes, null, 2),
      (err) => {
        if (err) return callback(err);
        callback(null);
      }
    );
  });
}

/* ===============================
   EXPORTS
================================ */

module.exports = {
  agregarCliente,
  actualizarCliente,
  borrarCliente
};
