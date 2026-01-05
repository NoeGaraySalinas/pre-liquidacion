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

      <div class="form-group">
        <label for="topeMensual">Tope mensual:</label>
        <input type="number" id="topeMensual" placeholder="Tope mensual" step="0.01" min="0">
      </div>

      <div class="form-group">
        <label for="topeAnual">Tope anual:</label>
        <input type="number" id="topeAnual" placeholder="Tope anual" step="0.01" min="0">
      </div>

<input type="hidden" id="facturanteIdEdit">


      <div class="form-actions">
        <button type="button" id="guardarEdicionFacturante" style="display:none;">Guardar Cambios</button>
        <button type="submit" id="guardarFacturante">Guardar Facturante</button>
        <button type="button" id="cancelarFacturante">Cancelar</button>
      </div>
    </form>

    <table id="facturantesTable">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>CUIL/CUIT</th>
          <th>Tope Mensual</th>
          <th>Tope Anual</th>
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
  document.getElementById("guardarEdicionFacturante").addEventListener("click", () => {
  const id = Number(document.getElementById("facturanteIdEdit").value);
  const nombre = document.getElementById("nombreFacturante").value.trim();
  const cuilCuit = document.getElementById("cuilCuit").value.trim() || null;
  const topeMensual = parseFloat(document.getElementById("topeMensual").value);
  const topeAnual = parseFloat(document.getElementById("topeAnual").value);

  if (!nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  const actualizado = { id, nombre, cuilCuit, topeMensual, topeAnual };
  ipcRenderer.send("actualizar-facturante", actualizado);

  ipcRenderer.once("facturante-actualizado", () => {
    alert("Facturante actualizado correctamente.");
    document.getElementById("facturanteForm").reset();
    document.getElementById("facturanteForm").style.display = "none";
    document.getElementById("guardarFacturante").style.display = "inline-block";
    document.getElementById("guardarEdicionFacturante").style.display = "none";
    loadFacturantesData();
  });
});

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
    hideFacturanteForm({ preventDefault: () => { } });
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
    <td>${facturante.topeMensual?.toFixed(2) || "-"}</td>
    <td>${facturante.topeAnual?.toFixed(2) || "-"}</td>
    <td>
    <button class="edit-facturante-btn" data-id="${facturante.id}" title="Editar">✏️</button>
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

  document.querySelectorAll(".edit-facturante-btn").forEach(btn => {
    btn.addEventListener("click", (event) => {
      console.log("Botón ✏️ presionado"); // 👈 agregá esto

      const facturanteId = Number(event.target.dataset.id);
      ipcRenderer.send("obtener-facturantes");

      ipcRenderer.once("facturantes-data", (event, facturantes) => {
        const facturante = facturantes.find(f => f.id === facturanteId);
        if (!facturante) {
          console.warn("No se encontró el facturante con ID:", facturanteId);
          return;
        }

        document.getElementById("facturanteIdEdit").value = facturante.id;
        document.getElementById("nombreFacturante").value = facturante.nombre;
        document.getElementById("cuilCuit").value = facturante.cuilCuit || "";
        document.getElementById("topeMensual").value = facturante.topeMensual || "";
        document.getElementById("topeAnual").value = facturante.topeAnual || "";

        document.getElementById("facturanteForm").style.display = "block";
        document.getElementById("guardarFacturante").style.display = "none";
        document.getElementById("guardarEdicionFacturante").style.display = "inline-block";
      });
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