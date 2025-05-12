if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}


console.log("Renderer de Clientes cargado correctamente");



// Inicializar solo lo relacionado con clientes cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  initializeGestionClientesBtn();
});

// Inicializar el botón "Gestionar Clientes"
function initializeGestionClientesBtn() {
  const btn = document.getElementById("gestionarClientesBtn");
  if (!btn) {
    console.error("Botón 'Gestionar Clientes' no encontrado");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Botón 'Gestionar Clientes' presionado.");
    loadClientesTable();
  });
}

// Función principal para cargar la tabla de clientes
function loadClientesTable() {
  document.getElementById("div3").innerHTML = `
    <h2>Gestión de Clientes</h2>
    <button id="agregarClienteBtn">Agregar Cliente</button>
    <button id="editarClienteBtn">Editar Cliente</button>

    <form id="clientForm" style="display: none; margin-top: 10px;">
      <input type="text" id="nombre" placeholder="Nombre">
      <input type="text" id="lugar" placeholder="Lugar">
      <input type="text" id="cuit" placeholder="CUIT">
      <button id="guardarCliente">Guardar Cliente</button>
      <button id="cancelarFormulario">Cancelar</button>
    </form>

    <form id="editClientForm" style="display: none; margin-top: 10px;">
      <input type="text" id="editNombre" placeholder="Nombre">
      <input type="text" id="editLugar" placeholder="Lugar">
      <input type="text" id="editCuit" placeholder="CUIT" disabled>
      <button id="guardarEdicion">Guardar Cambios</button>
      <button id="cancelarEdicion">Cancelar</button>
    </form>

    <table id="clientesTable">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Lugar</th>
          <th>CUIT</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="clientesTableBody"></tbody>
    </table>
  `;

  // Agregar eventos a los botones de gestión de clientes
  setupClienteButtonHandlers();
  loadClientesData();
}

// Ocultar el formulario de edición de cliente
function hideEditForm(event) {
  event.preventDefault();
  document.getElementById("editClientForm").style.display = "none";
}

// Configuración de los botones de gestión de clientes
function setupClienteButtonHandlers() {
  document.getElementById("agregarClienteBtn")?.addEventListener("click", showClientForm);
  document.getElementById("editarClienteBtn")?.addEventListener("click", enableEditMode);
  document.getElementById("guardarCliente")?.addEventListener("click", saveNewClient);
  document.getElementById("guardarEdicion")?.addEventListener("click", saveClientEdit);
  document.getElementById("cancelarFormulario")?.addEventListener("click", hideClientForm);
  document.getElementById("cancelarEdicion")?.addEventListener("click", hideEditForm);
}

// Cargar clientes desde el proceso principal
function loadClientesData() {
  console.log("Enviando solicitud para obtener clientes...");
  ipcRenderer.send("get-clients");

  ipcRenderer.on("clients-data", (event, clientes) => {
    console.log("Recibida respuesta con clientes:", clientes);

    if (!clientes || clientes.length === 0) {
      console.log("No hay clientes para mostrar.");
      document.getElementById("clientesTableBody").innerHTML = "<tr><td colspan='4'>No hay clientes registrados.</td></tr>";
      return;
    }
    populateClientesTable(clientes);
  });
}

// Población de la tabla con clientes
function populateClientesTable(clientes) {
  console.log("Poblando tabla con clientes:", clientes);

  const lista = document.getElementById("clientesTableBody");
  lista.innerHTML = "";
  clientes.forEach(cliente => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cliente.nombre}</td>
      <td>${cliente.lugar}</td>
      <td>${cliente.cuit}</td>
      <td>
        <button class="delete-btn" data-cuit="${cliente.cuit}" title="Eliminar">
          🗑️
        </button>
      </td>
    `;
    lista.appendChild(tr);
  });

  // Agregar eventos a los botones de eliminar
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const cuit = event.target.getAttribute("data-cuit");
      eliminarCliente(cuit);
    });
  });

  console.log("Tabla de clientes actualizada.");
}

// Función para eliminar un cliente
function eliminarCliente(cuit) {
  if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
    ipcRenderer.send("delete-client", cuit);
    ipcRenderer.once("client-deleted", () => {
      loadClientesData();
    });
  }
}

// Habilitar edición
function enableEditMode() {
  mode = "edit";
  alert("Selecciona un solo cliente para editar manualmente en la tabla.");
}

// Mostrar formulario de nuevo cliente
function showClientForm() {
  document.getElementById("clientForm").style.display = "block";
}

// Ocultar formulario de nuevo cliente
function hideClientForm(event) {
  event.preventDefault();
  document.getElementById("clientForm").style.display = "none";
}

// Guardar un nuevo cliente
function saveNewClient(event) {
  event.preventDefault();
  const nuevoCliente = {
    cuit: document.getElementById("cuit").value.trim(),
    lugar: document.getElementById("lugar").value.trim(),
    nombre: document.getElementById("nombre").value.trim(),
  };

  ipcRenderer.send("save-client", nuevoCliente);
  alert("Cliente guardado exitosamente.");
  document.getElementById("clientForm").style.display = "none";
  loadClientesData();
}

// Guardar edición de cliente
function saveClientEdit(event) {
  event.preventDefault();
  const clienteEditado = {
    cuit: document.getElementById("editCuit").value.trim(),
    lugar: document.getElementById("editLugar").value.trim(),
    nombre: document.getElementById("editNombre").value.trim(),
  };

  ipcRenderer.send("update-client", clienteEditado);
  alert("Cliente editado exitosamente.");
  document.getElementById("editClientForm").style.display = "none";
  loadClientesData();
}

document.querySelectorAll(".edit-btn").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    const cuit = event.target.getAttribute("data-cuit");
    const cliente = clientes.find(c => c.cuit === cuit);
    if (cliente) {
      document.getElementById("editNombre").value = cliente.nombre;
      document.getElementById("editLugar").value = cliente.lugar;
      document.getElementById("editCuit").value = cliente.cuit;
      document.getElementById("editClientForm").style.display = "block";
    }
  });
});
