if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}

console.log("renderer.js cargado correctamente");

// Inicializar los eventos del DOM cuando esté listo
document.addEventListener("DOMContentLoaded", () => {
  initializeGestionServiciosBtn();
  initializeGestionClientesBtn();
  initializeFacturantesBtn();
  initializeReporteGeneralBtn();
});

window.addEventListener("DOMContentLoaded", () => {
  const btnReporteGeneral = document.getElementById("reporteGeneral");
  if (btnReporteGeneral) {
    btnReporteGeneral.addEventListener("click", loadReporteGeneral);
  } else {
    console.error("Botón #reporteGeneral no encontrado");
  }
});

// Inicializar el botón "Gestionar Clientes"
function initializeGestionClientesBtn() {
  document.getElementById("gestionarClientesBtn").addEventListener("click", () => {
    console.log("Botón 'Gestionar Clientes' presionado.");
    loadClientesTable();
  });
}

// Función para inicializar el botón de reporte general
function initializeReporteGeneralBtn() {
  const botonReporte = document.getElementById("reporteGeneral");
  if (botonReporte) {
    botonReporte.addEventListener("click", generarReporte);
  } else {
    console.error("El botón #reporteGeneral no se encontró en el DOM.");
  }
}


//Facturantes
// Inicializar el botón "Responsables de Facturación"
function initializeFacturantesBtn() {
  document.getElementById("facturantes").addEventListener("click", () => {
    console.log("Botón 'Facturantes' presionado.");
    loadFacturantesTable();
  });
}

window.initializeFacturantesBtn = initializeFacturantesBtn;

function loadFacturantesTable() {
  document.getElementById("div3").innerHTML = `
    <h2>Gestión de Responsables de Facturación</h2>
    <button id="agregarFacturanteBtn">Agregar Facturante</button>

    <form id="facturanteForm" style="display: none; margin-top: 10px;">
      <div class="form-group">
        <label for="nombreFacturante">Nombre:</label>
        <input type="text" id="nombreFacturante" placeholder="Nombre" required>
      </div>

      <div class="form-group">
        <label for="cuilCuit">CUIL/CUIT (opcional):</label>
        <input type="text" id="cuilCuit" placeholder="CUIL/CUIT">
      </div>

      <div class="form-actions">
        <button type="submit" id="guardarFacturante">Guardar Facturante</button>
        <button type="button" id="cancelarFacturante">Cancelar</button>
      </div>
    </form>

    <table id="facturantesTable">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>CUIL/CUIT</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="facturantesTableBody"></tbody>
    </table>
  `;

  setupFacturanteButtonHandlers();
  loadFacturantesData();
}

function setupFacturanteButtonHandlers() {
  const div3 = document.getElementById("div3");

  // Limpiar listeners previos para evitar duplicados
  ipcRenderer.removeAllListeners(["facturante-guardado", "error-facturante"]);

  div3.addEventListener("click", (event) => {
    if (event.target.id === "agregarFacturanteBtn") {
      showFacturanteForm();
    }
    if (event.target.id === "cancelarFacturante") {
      hideFacturanteForm(event);
    }
  });

  // Manejador del formulario
  const form = document.getElementById("facturanteForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveNewFacturante(event);
    });
  }
}

function showFacturanteForm() {
  document.getElementById("facturanteForm").style.display = "block";
}

function hideFacturanteForm(event) {
  event.preventDefault();
  document.getElementById("facturanteForm").reset();
  document.getElementById("facturanteForm").style.display = "none";
}

function saveNewFacturante(event) {
  event.preventDefault();

  const facturante = {
    nombre: document.getElementById("nombreFacturante").value.trim(),
    cuilCuit: document.getElementById("cuilCuit").value.trim() || null,
  };

  if (!facturante.nombre) {
    alert("El facturante debe tener un nombre.");
    return;
  }

  console.log("Facturante a enviar:", facturante);
  ipcRenderer.send("guardar-facturante", facturante);

  // Configurar el listener para cuando se guarde el facturante
  ipcRenderer.once("facturante-guardado", () => {
    console.log("Facturante guardado correctamente");
    loadFacturantesData();
    hideFacturanteForm({ preventDefault: () => {} });
  });
}

function loadFacturantesData() {
  console.log("Enviando solicitud para obtener facturantes...");
  ipcRenderer.send("obtener-facturantes");

  ipcRenderer.once("facturantes-data", (event, facturantes) => {
    console.log("Facturantes recibidos:", facturantes);

    const tableBody = document.getElementById("facturantesTableBody");
    if (!tableBody) return;

    if (!facturantes || facturantes.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='3'>No hay responsables de facturación registrados.</td></tr>";
      return;
    }

    populateFacturantesTable(facturantes);
  });
}

function populateFacturantesTable(facturantes) {
  const lista = document.getElementById("facturantesTableBody");
  lista.innerHTML = "";

  facturantes.forEach((facturante) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${facturante.nombre}</td>
      <td>${facturante.cuilCuit || "-"}</td>
      <td>
        <button class="delete-btn" data-id="${facturante.id}" title="Eliminar">🗑️</button>
      </td>
    `;
    lista.appendChild(tr);
  });

  // Agregar event listeners para los botones de eliminar
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (event) => {
      const facturanteId = event.target.dataset.id;
      deleteFacturante(facturanteId);
    });
  });
}

function deleteFacturante(facturanteId) {
  console.log("Eliminando facturante con ID:", facturanteId);
  ipcRenderer.send("eliminar-facturante", facturanteId);

  ipcRenderer.once("facturante-eliminado", () => {
    console.log("Facturante eliminado correctamente");
    loadFacturantesData();
  });
}

ipcRenderer.on("error-facturante", (event, mensajeError) => {
  alert(`Error al guardar el facturante: ${mensajeError}`);
});