const fs = require('fs'); // Módulo de Node.js para manejar archivos

const clientesFile = './clientes.json'; // Ruta al archivo donde se almacenarán los clientes

// Verifica si el archivo de clientes existe, si no, lo crea vacío
if (!fs.existsSync(clientesFile)) {
    fs.writeFileSync(clientesFile, JSON.stringify([])); // Crea un archivo vacío con un array
}

/**
 * Función para agregar un cliente.
 * @param {string} nombre Nombre o razón social del cliente.
 * @param {string} alias Alias del cliente.
 * @param {string} cuit CUIT del cliente.
 * @param {string} domicilioFisico Domicilio físico del cliente.
 * @param {string} domicilioFacturacion Domicilio de facturación del cliente.
 * @param {string} iva IVA del cliente.
 * @param {string} condVenta Condición de venta del cliente.
 * @param {function} callback Función de callback con los resultados.
 */
const agregarCliente = (nombre, alias, cuit, domicilioFisico, domicilioFacturacion, iva, condVenta, callback) => {
  // Lee el archivo de clientes
  fs.readFile(clientesFile, 'utf8', (err, data) => {
      if (err) {
          return callback(err);
      }

      const clientes = JSON.parse(data); // Convierte el contenido JSON a un array de objetos

      // Crear un nuevo objeto cliente con los nuevos campos
      const nuevoCliente = {
          id: clientes.length + 1, // Generamos un ID simple
          nombre: nombre,
          alias: alias,
          cuit: cuit,
          domicilioFisico: domicilioFisico,
          domicilioFacturacion: domicilioFacturacion,
          iva: iva,
          condVenta: condVenta
      };

      // Agregar el nuevo cliente al array de clientes
      clientes.push(nuevoCliente);

      // Guardar el array actualizado de clientes en el archivo
      fs.writeFile(clientesFile, JSON.stringify(clientes, null, 2), (err) => {
          if (err) {
              return callback(err);
          }
          callback(null, nuevoCliente.id); // Llama al callback con el ID del nuevo cliente
      });
  });
};

// Actualizar Cliente
function actualizarCliente(clienteEditado, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return callback(err);
  
      let clientes = JSON.parse(data);
      const index = clientes.findIndex(c => c.id == clienteEditado.id);
  
      if (index !== -1) {
        clientes[index] = clienteEditado;
  
        fs.writeFile(filePath, JSON.stringify(clientes, null, 2), (err) => {
          if (err) return callback(err);
          callback(null);
        });
      } else {
        callback(new Error('Cliente no encontrado'));
      }
    });
  }

  // Borrar Cliente
function borrarCliente(id, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return callback(err);
  
      let clientes = JSON.parse(data);
      clientes = clientes.filter(c => c.id != id);
  
      fs.writeFile(filePath, JSON.stringify(clientes, null, 2), (err) => {
        if (err) return callback(err);
        callback(null);
      });
    });
  }

function eliminarCliente(id) {
  return new Promise((resolve, reject) => {
      db.run('DELETE FROM clientes WHERE id = ?', [id], function (err) {
          if (err) {
              reject(err);
          } else {
              resolve();
          }
      });
  });
}

module.exports = { agregarCliente, eliminarCliente, borrarCliente, actualizarCliente };