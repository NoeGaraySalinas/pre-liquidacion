const { ipcRenderer } = require('electron');
console.log("ipcRenderer methods:", Object.keys(ipcRenderer));
const path = require('path');
const fs = require('fs');

console.log("renderer-servicios.js cargado correctamente");
console.log("ipcRenderer real?", ipcRenderer.send ? "✅ sí" : "❌ no");

// Mover estas funciones fuera para que no se redefinan
function formatDecimal(num) {
  return parseFloat(num).toFixed(2);
}

function deleteServicio(servicioId) {
  if (!confirm("¿Está seguro que desea eliminar este servicio?")) {
    return;
  }

  console.log("Eliminando servicio con ID:", servicioId);
  ipcRenderer.send('eliminar-servicio', servicioId);
}

document.addEventListener("DOMContentLoaded", () => {
  initializeGestionServiciosBtn();
  setupGlobalIpcListeners(); // Configurar listeners globales UNA vez
});

window.addEventListener("DOMContentLoaded", () => {
  const btnReporteGeneral = document.getElementById("reporteGeneral");
  if (btnReporteGeneral) {
    btnReporteGeneral.addEventListener("click", loadReporteGeneral);
  } else {
    console.error("Botón #reporteGeneral no encontrado");
  }
});

// Configurar listeners IPC globales (solo una vez)
function setupGlobalIpcListeners() {
  // Limpiar listeners previos para evitar duplicados
  ipcRenderer.removeAllListeners(['servicio-guardado', 'error-servicio', 'servicio-eliminado', 'servicio-actualizado']);

  ipcRenderer.on('servicio-guardado', () => {
    console.log("✔ Servicio guardado correctamente");
    hideServicioForm();
    loadServiciosData();
  });

  ipcRenderer.on('servicio-actualizado', () => {
    alert("Servicio editado exitosamente.");
    hideServicioForm();
    document.getElementById("guardarServicio").style.display = "inline-block";
    document.getElementById("guardarEdicionServicio").style.display = "none";
    loadServiciosData();
  });

  ipcRenderer.on('servicio-eliminado', () => {
    console.log("Servicio eliminado correctamente");
    loadServiciosData();
  });

  ipcRenderer.on('error-servicio', (event, mensajeError) => {
    alert(`Error: ${mensajeError}`);
  });
}

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

      <div class="form-group">
        <label for="categoria">Categoría:</label>
        <select id="categoria" required>
          <option value="mensual">Mensual</option>
          <option value="FO">Final de Obra</option>
        </select>
      </div>

            <div class="form-group">
        <label for="gremio">Gremio:</label>
        <select id="gremio" required>
          <option value="" disabled selected>Seleccionar gremio...</option>
          <option value="SOELSAC">SOELSAC (Limpieza)</option>
          <option value="SUVICO">SUVICO (Seguridad)</option>
          <option value="FO">FO (Final de Obra – sin aumentos)</option>
        </select>
      </div>


      <div class="form-group">
        <label for="valorHora">Valor hora:</label>
        <input type="number" id="valorHora" placeholder="Valor hora" step="0.01" min="0.01" required>
      </div>

      <div class="form-actions">
        <button type="button" id="guardarServicio">Guardar Servicio</button>
        <button type="button" id="guardarEdicionServicio" style="display: none;">Guardar Cambios</button>
        <button type="button" id="cancelarServicio">Cancelar</button>
      </div>
    </form>

    <table id="serviciosTable">
  <thead>
    <tr>
      <th>Nombre</th>
      <th>Cant. Operarios</th>
      <th>Horas Autorizadas</th>
      <th>Categoría</th>
      <th>Gremio</th>
      <th>Valor Hora</th>
      <th>Acciones</th>
    </tr>
  </thead>

  <tbody id="serviciosTableBody"></tbody>
</table>


    <input type="hidden" id="servicioIdEdit">
  `;

  setupServicioButtonHandlers();
  loadServiciosData();
}

function setupServicioButtonHandlers() {
  const div3 = document.getElementById('div3');

  // Clicks delegados (agregar / cancelar)
  div3.addEventListener('click', (event) => {
    if (event.target.id === 'agregarServicioBtn') showServicioForm();
    if (event.target.id === 'cancelarServicio') hideServicioForm();
  });

  // Guardar servicio nuevo
  document.getElementById("guardarServicio")?.addEventListener("click", saveNewServicio);

  // Guardar edición
  document.getElementById("guardarEdicionServicio")?.addEventListener("click", saveServicioEditado);
}

function showServicioForm() {
  document.getElementById('serviceForm').style.display = "block";
}

function hideServicioForm() {
  document.getElementById("serviceForm").reset();
  document.getElementById("serviceForm").style.display = "none";
  document.getElementById("servicioIdEdit").value = "";
}

function saveNewServicio() {
  const servicio = {
    nombre: document.getElementById('nombre').value.trim(),
    operarios: parseFloat(document.getElementById('operarios').value),
    horasAutorizadas: parseFloat(document.getElementById('horasAutorizadas').value),
    categoria: document.getElementById('categoria').value,
    valorHora: parseFloat(document.getElementById('valorHora').value),
    gremio: document.getElementById('gremio').value   //  <-- NUEVO
  };


  // Validación
  if (!servicio.nombre || isNaN(servicio.operarios) || isNaN(servicio.horasAutorizadas) || !servicio.categoria || isNaN(servicio.valorHora)) {
    return alert("Completa todos los campos correctamente!");
  }

  // Redondear a 2 decimales
  servicio.operarios = Math.round(servicio.operarios * 100) / 100;
  servicio.horasAutorizadas = Math.round(servicio.horasAutorizadas * 100) / 100;
  servicio.valorHora = Math.round(servicio.valorHora * 100) / 100;

  console.log("Servicio a enviar desde renderer:", servicio);
  ipcRenderer.send('guardar-servicio', servicio);
}

function saveServicioEditado(event) {
  event.preventDefault();

  const servicioEditado = {
    id: document.getElementById("servicioIdEdit").value,
    nombre: document.getElementById("nombre").value.trim(),
    operarios: parseFloat(document.getElementById("operarios").value),
    horasAutorizadas: parseFloat(document.getElementById("horasAutorizadas").value),
    categoria: document.getElementById("categoria").value,
    valorHora: parseFloat(document.getElementById("valorHora").value),
    gremio: document.getElementById("gremio").value   // <-- agregado
  };


  // Validación
  if (!servicioEditado.nombre) {
    alert("El nombre del servicio es obligatorio.");
    return;
  }

  if (isNaN(servicioEditado.operarios) || servicioEditado.operarios <= 0) {
    alert("La cantidad de operarios debe ser un número válido mayor que 0.");
    return;
  }

  if (isNaN(servicioEditado.horasAutorizadas) || servicioEditado.horasAutorizadas <= 0) {
    alert("Las horas autorizadas deben ser un número válido mayor que 0.");
    return;
  }

  // Redondear
  servicioEditado.operarios = Math.round(servicioEditado.operarios * 100) / 100;
  servicioEditado.horasAutorizadas = Math.round(servicioEditado.horasAutorizadas * 100) / 100;
  servicioEditado.valorHora = Math.round(servicioEditado.valorHora * 100) / 100;

  ipcRenderer.send("actualizar-servicio", servicioEditado);
}

async function loadServiciosData() {
  console.log("Enviando solicitud para obtener servicios...");

  try {
    const servicios = await ipcRenderer.invoke("get-servicios");
    console.log("Servicios recibidos:", servicios);

    const tableBody = document.getElementById("serviciosTableBody");
    if (!tableBody) return;

    if (!servicios || servicios.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='7'>No hay servicios registrados.</td></tr>";
      return;
    }

    populateServiciosTable(servicios);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
  }
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
      <td>${servicio.categoria}</td>
      <td>${servicio.gremio ?? "—"}</td>
      <td>${formatDecimal(servicio.valorHora)}</td>
      <td>
        <button class="edit-servicio-btn" data-id="${servicio.id}" title="Editar">✏️</button>
        <button class="delete-btn" data-id="${servicio.id}" title="Eliminar">🗑️</button>
      </td>
    `;
    lista.appendChild(tr);
  });

  // Botones eliminar
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", event => {
      deleteServicio(event.target.dataset.id);
    });
  });

  // Botones editar
  document.querySelectorAll(".edit-servicio-btn").forEach(btn => {
    btn.addEventListener("click", event => {
      const id = event.target.dataset.id;
      const servicio = servicios.find(s => s.id.toString() === id);

      if (!servicio) return;

      document.getElementById("servicioIdEdit").value = servicio.id;
      document.getElementById("nombre").value = servicio.nombre;
      document.getElementById("operarios").value = servicio.operarios;
      document.getElementById("horasAutorizadas").value = servicio.horasAutorizadas;
      document.getElementById("categoria").value = servicio.categoria;
      document.getElementById("valorHora").value = servicio.valorHora;
      document.getElementById("gremio").value = servicio.gremio ?? "";

      document.getElementById("serviceForm").style.display = "block";
      document.getElementById("guardarServicio").style.display = "none";
      document.getElementById("guardarEdicionServicio").style.display = "inline-block";
    });
  });
}
