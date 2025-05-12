if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}

console.log("renderer-servicios.js cargado correctamente");

document.addEventListener("DOMContentLoaded", () => {
  initializeGestionServiciosBtn();
});

window.addEventListener("DOMContentLoaded", () => {
  const btnReporteGeneral = document.getElementById("reporteGeneral");
  if (btnReporteGeneral) {
    btnReporteGeneral.addEventListener("click", loadReporteGeneral);
  } else {
    console.error("Botón #reporteGeneral no encontrado");
  }
});

// Servicios
function initializeGestionServiciosBtn() {
  const btn = document.getElementById('gestionarServiciosBtn');
  if (!btn) {
    console.error("No se encontró el botón 'gestionarServiciosBtn'");
    return;
  }

  btn.addEventListener('click', () => {
    console.log("Botón 'Gestionar Servicios' presionado - Cargando tabla de servicios");
    loadServiciosTable();
  });
}

function loadServiciosTable() {
  document.getElementById("div3").innerHTML = `
    <h2>Gestión de Servicios</h2>
    <button id="agregarServicioBtn">Agregar Servicio</button>

    <form id="serviceForm" style="display: none; margin-top: 10px;">
      <div class="form-group">
        <label for="nombre">Nombre:</label>
        <input type="text" id="nombre" placeholder="Nombre" required>
      </div>

      <div class="form-group">
        <label for="operarios">Cant. de operarios:</label>
        <input type="number" id="operarios" placeholder="Cantidad de operarios" step="0.01" min="0.01" required>
      </div>

      <div class="form-group">
        <label for="horasAutorizadas">Horas autorizadas:</label>
        <input type="number" id="horasAutorizadas" placeholder="Horas autorizadas" step="0.01" min="0.01" required>
      </div>

      <div class="form-actions">
        <button type="submit" id="guardarServicio">Guardar Servicio</button>
        <button type="button" id="cancelarServicio">Cancelar</button>
      </div>
    </form>

    <table id="serviciosTable">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Cant. Operarios</th>
          <th>Horas Autorizadas</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="serviciosTableBody"></tbody>
    </table>
  `;

  setupServicioButtonHandlers();
  loadServiciosData();
}

function setupServicioButtonHandlers() {
  const div3 = document.getElementById('div3');
  
  // Limpiar listeners previos
  ipcRenderer.removeAllListeners(['servicio-guardado', 'error-servicio', 'servicios-data', 'servicio-eliminado']);

  // Manejador para el botón de agregar y cancelar
  div3.addEventListener('click', (event) => {
    if (event.target.id === 'agregarServicioBtn') {
      showServicioForm();
    }
    if (event.target.id === 'cancelarServicio') {
      hideServicioForm(event);
    }
  });

  // Manejador del formulario
  const form = document.getElementById('serviceForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveNewServicio();
    });
  }
}

function showServicioForm() {
  document.getElementById('serviceForm').style.display = "block";
}

function hideServicioForm(event) {
  event.preventDefault();
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceForm').style.display = "none";
}

function saveNewServicio() {
  // Redondear a 2 decimales para evitar problemas de precisión
  const operariosValue = document.getElementById('operarios').value;
  const horasValue = document.getElementById('horasAutorizadas').value;

  const servicio = {
    nombre: document.getElementById('nombre').value.trim(),
    operarios: parseFloat(operariosValue),
    horasAutorizadas: parseFloat(horasValue)
  };

  // Validar que los valores tengan máximo 2 decimales
  if (!/^\d+(\.\d{1,2})?$/.test(operariosValue)) {
    alert("La cantidad de operarios debe tener máximo 2 decimales.");
    return;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(horasValue)) {
    alert("Las horas autorizadas deben tener máximo 2 decimales.");
    return;
  }

  if (!servicio.nombre) {
    alert("El servicio debe tener un nombre.");
    return;
  }

  if (isNaN(servicio.operarios) || servicio.operarios <= 0) {
    alert("La cantidad de operarios debe ser un número válido mayor que 0.");
    return;
  }

  if (isNaN(servicio.horasAutorizadas) || servicio.horasAutorizadas <= 0) {
    alert("Las horas autorizadas deben ser un número válido mayor que 0.");
    return;
  }

  // Redondear a 2 decimales antes de enviar
  servicio.operarios = Math.round(servicio.operarios * 100) / 100;
  servicio.horasAutorizadas = Math.round(servicio.horasAutorizadas * 100) / 100;

  console.log("Servicio a enviar:", servicio);
  ipcRenderer.send('guardar-servicio', servicio);

  // Configurar el listener para cuando se guarde el servicio
  ipcRenderer.once('servicio-guardado', () => {
    console.log("Servicio guardado correctamente");
    loadServiciosData();
    hideServicioForm({ preventDefault: () => {} });
  });
}

function loadServiciosData() {
  console.log("Enviando solicitud para obtener servicios...");
  ipcRenderer.send("obtener-servicios");

  ipcRenderer.once("servicios-data", (event, servicios) => {
    console.log("Servicios recibidos:", servicios);

    const tableBody = document.getElementById("serviciosTableBody");
    if (!tableBody) return;

    if (!servicios || servicios.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='4'>No hay servicios registrados.</td></tr>";
      return;
    }

    populateServiciosTable(servicios);
  });
}

function populateServiciosTable(servicios) {
  const lista = document.getElementById("serviciosTableBody");
  lista.innerHTML = "";

  servicios.forEach(servicio => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${servicio.nombre}</td>
      <td>${formatDecimal(servicio.operarios)}</td>
      <td>${formatDecimal(servicio.horasAutorizadas)}</td>
      <td>
        <button class="delete-btn" data-id="${servicio.id}" title="Eliminar">🗑️</button>
      </td>
    `;
    lista.appendChild(tr);
  });

  // Agregar event listeners para los botones de eliminar
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (event) => {
      const servicioId = event.target.dataset.id;
      deleteServicio(servicioId);
    });
  });
}

// Función para formatear números decimales (muestra 2 decimales siempre)
function formatDecimal(num) {
  return num.toFixed(2);
}

function deleteServicio(servicioId) {
  if (!confirm("¿Está seguro que desea eliminar este servicio?")) {
    return;
  }

  console.log("Eliminando servicio con ID:", servicioId);
  ipcRenderer.send('eliminar-servicio', servicioId);

  ipcRenderer.once('servicio-eliminado', () => {
    console.log("Servicio eliminado correctamente");
    loadServiciosData();
  });
}

ipcRenderer.on('error-servicio', (event, mensajeError) => {
  alert(`Error al guardar el servicio: ${mensajeError}`);
});