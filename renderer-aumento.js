// renderer-aumento.js
console.log("renderer-aumento.js cargado ✅");

// =====================
//   CARGAR FORMULARIO
// =====================
function loadAumentoForm() {
  const div3 = document.getElementById("div3");
  if (!div3) {
    console.error("❌ No se encontró div3");
    return;
  }

  div3.innerHTML = `
    <h2>Gestión de Aumentos</h2>

    <div class="form-section">
      <h3>Registrar Aumento</h3>

      <form id="aumentoForm">

        <div class="form-row">
          <div class="form-group">
            <label for="aumentoGremio">Gremio</label>
            <select id="aumentoGremio" required>
              <option value="" disabled selected>Seleccionar gremio</option>
              <option value="SOELSAC">SOELSAC (Limpieza)</option>
              <option value="SUVICO">SUVICO (Seguridad)</option>
              <option value="FO">Final de Obra (sin aumentos)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="aumentoTipo">Tipo de aumento</label>
            <select id="aumentoTipo" required>
              <option value="acumulativo">Acumulativo</option>
              <option value="sobre-saldos">Sobre Saldos</option>
            </select>
          </div>
        </div>

        <h3>Meses y Porcentajes</h3>

        <div id="mesesContainer"></div>

        <button type="button" class="btn-secondary" id="addMesBtn">+ Agregar mes</button>

        <br><br>

        <button type="submit" id="guardarAumento" class="btn-primary">Guardar Aumento</button>
        <button type="button" id="guardarAumentoEdit" class="btn-primary" style="display:none;">Guardar Cambios</button>

        <button type="button" id="cancelarAumento" class="btn-secondary" style="display:none;">Cancelar</button>

        <input type="hidden" id="aumentoIdEdit">
      </form>
    </div>

    <table class="styled-table">
      <thead>
        <tr>
          <th>Gremio</th>
          <th>Tipo</th>
          <th>Meses</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="aumentoTableBody"></tbody>
    </table>
  `;

  document.getElementById("addMesBtn").addEventListener("click", addMesRow);

  setAumentoListeners();
  loadAumentoData();
}

// ========================
//   LISTENERS PRINCIPALES
// ========================
function setAumentoListeners() {
  const div3 = document.getElementById("div3");

  // Guardar nuevo aumento
  div3.querySelector("#guardarAumento").addEventListener("click", async (e) => {
    e.preventDefault();
    await saveNewAumento();
  });

  // Guardar edición
  div3.querySelector("#guardarAumentoEdit").addEventListener("click", async (e) => {
    e.preventDefault();
    await saveEditedAumento();
  });

  // Cancelar edición
  div3.querySelector("#cancelarAumento").addEventListener("click", () => resetAumentoForm());

  // Delegado global para editar y eliminar
  document.addEventListener("click", async (e) => {
    // Eliminar
    if (e.target.classList.contains("btn-delete-aumento")) {
      const id = e.target.dataset.id;
      if (!confirm("¿Eliminar aumento?")) return;
      await ipcRenderer.invoke("eliminar-aumento", id);
      loadAumentoData();
    }

    // Editar
    if (e.target.classList.contains("btn-edit-aumento")) {
      const id = e.target.dataset.id;
      const aumentos = await ipcRenderer.invoke("get-aumentos");
      const a = aumentos.find(x => x.id == id);
      if (a) loadAumentoToForm(a);
    }
  });
}

//      AGREGAR MESES
function addMesRow() {
  const container = document.getElementById("mesesContainer");
  const id = Date.now();

  const row = document.createElement("div");
  row.classList.add("form-row");
  row.dataset.id = id;

  row.innerHTML = `
    <div class="form-group">
      <label>Mes</label>
      <input type="month" class="mes-input" required>
    </div>

    <div class="form-group">
      <label>Aumento (%)</label>
      <input type="number" class="porcentaje-input" step="0.01" required>
    </div>

    <button type="button" class="btn-delete remove-mes" data-id="${id}">❌</button>
  `;

  container.appendChild(row);
}

// Quitar mes
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-mes")) {
    const id = e.target.dataset.id;
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row) row.remove();
  }
});


//   GUARDAR NUEVO
async function saveNewAumento() {
  const gremio = document.getElementById("aumentoGremio").value;
  const tipo = document.getElementById("aumentoTipo").value;

  if (!gremio || !tipo) {
    alert("⚠️ Seleccioná gremio y tipo de aumento");
    return;
  }

  const meses = [...document.querySelectorAll("#mesesContainer .form-row")].map(row => ({
    mes: row.querySelector(".mes-input").value,
    porcentaje: parseFloat(row.querySelector(".porcentaje-input").value)
  }));

  if (meses.length === 0) {
    alert("⚠️ Agregá al menos un mes");
    return;
  }

  const aumento = {
    id: Date.now(),
    gremio,
    tipo,
    meses
  };

  await ipcRenderer.invoke("guardar-aumento", aumento);
  resetAumentoForm();
  loadAumentoData();
}

//        EDITAR
function loadAumentoToForm(a) {
  document.getElementById("aumentoForm").style.display = "block";

  document.getElementById("guardarAumento").style.display = "none";
  document.getElementById("guardarAumentoEdit").style.display = "inline-block";
  document.getElementById("cancelarAumento").style.display = "inline-block";

  document.getElementById("aumentoIdEdit").value = a.id;
  document.getElementById("aumentoGremio").value = a.gremio;
  document.getElementById("aumentoTipo").value = a.tipo;

  // reconstruir meses
  const container = document.getElementById("mesesContainer");
  container.innerHTML = "";

  a.meses.forEach(m => {
    const id = Date.now() + Math.random();
    const row = document.createElement("div");
    row.classList.add("form-row");
    row.dataset.id = id;
    row.innerHTML = `
      <div class="form-group">
        <label>Mes</label>
        <input type="month" class="mes-input" value="${m.mes}">
      </div>

      <div class="form-group">
        <label>Aumento (%)</label>
        <input type="number" class="porcentaje-input" value="${m.porcentaje}">
      </div>

      <button type="button" class="btn-delete remove-mes" data-id="${id}">❌</button>
    `;

    container.appendChild(row);
  });
}

//    GUARDAR EDICIÓN
async function saveEditedAumento() {
  const id = document.getElementById("aumentoIdEdit").value;

  const gremio = document.getElementById("aumentoGremio").value;
  const tipo = document.getElementById("aumentoTipo").value;

  const meses = [...document.querySelectorAll("#mesesContainer .form-row")].map(row => ({
    mes: row.querySelector(".mes-input").value,
    porcentaje: parseFloat(row.querySelector(".porcentaje-input").value)
  }));

  const aumento = { id, gremio, tipo, meses };

  await ipcRenderer.invoke("actualizar-aumento", aumento);
  resetAumentoForm();
  loadAumentoData();
}

//     TABLA CRUD
async function loadAumentoData() {
  const tbody = document.getElementById("aumentoTableBody");
  const aumentos = await ipcRenderer.invoke("get-aumentos") || [];

  tbody.innerHTML = "";

  if (aumentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay aumentos registrados</td></tr>`;
    return;
  }

  aumentos.forEach(a => {
    const mesesHtml = a.meses
      .map(m => `${m.mes}: ${m.porcentaje}%`)
      .join("<br>");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.gremio}</td>
      <td>${a.tipo}</td>
      <td>${mesesHtml}</td>
      <td>
        <button class="btn-edit-aumento" data-id="${a.id}">✏️</button>
        <button class="btn-delete-aumento" data-id="${a.id}">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.getAumentoAplicable = async function (gremio, periodoYYYYMM) {
  try {
    const aumentos = await ipcRenderer.invoke("get-aumentos");
    if (!aumentos || aumentos.length === 0) return null;

    const registro = aumentos.find(a => a.gremio === gremio);
    if (!registro) return null;

    const mesBuscado = periodoYYYYMM;
    
    // Ordenar meses cronológicamente
    const mesesOrdenados = registro.meses.sort((a, b) => a.mes.localeCompare(b.mes));
    
    // Encontrar el índice del mes buscado
    const indiceMesBuscado = mesesOrdenados.findIndex(m => m.mes === mesBuscado);
    
    if (indiceMesBuscado === -1) return null;

    let porcentajeFinal;
    let esUltimoMes = false;

    if (registro.tipo === "acumulativo") {
      // ✅ ACUMULATIVO REAL: Sumar todos los porcentajes hasta el mes buscado
      porcentajeFinal = mesesOrdenados
        .slice(0, indiceMesBuscado + 1)
        .reduce((total, mes) => total + mes.porcentaje, 0);
      
      // Marcar si es el último mes de la paritaria
      esUltimoMes = (indiceMesBuscado === mesesOrdenados.length - 1);
      
    } else if (registro.tipo === "sobre-saldos") {
      // ✅ SOBRE SALDOS: Solo el porcentaje del mes actual
      porcentajeFinal = mesesOrdenados[indiceMesBuscado].porcentaje;
      esUltimoMes = false; // No aplica para sobre-saldos
    }

    console.log("✅ Aumento aplicable calculado:", {
      gremio,
      periodo: mesBuscado,
      tipo: registro.tipo,
      porcentajeMesActual: mesesOrdenados[indiceMesBuscado].porcentaje,
      porcentajeFinal,
      esUltimoMes,
      mesesAcumulados: registro.tipo === "acumulativo" 
        ? mesesOrdenados.slice(0, indiceMesBuscado + 1).map(m => m.mes)
        : [mesBuscado]
    });

    return {
      gremio: registro.gremio,
      tipo: registro.tipo,
      mes: mesBuscado,
      porcentaje: porcentajeFinal,
      esUltimoMes: esUltimoMes,
      meses: registro.meses
    };
  } catch (err) {
    console.error("❌ Error buscando aumento:", err);
    return null;
  }
};


window.esUltimoMesAumento = function (aumento, periodoYYYYMM) {
  const listaMeses = aumento.meses.map(m => m.mes);
  const ultimoMes = listaMeses[listaMeses.length - 1];

  return ultimoMes === periodoYYYYMM;
};

window.calcularValorHoraAumentado = function (valorBase, aumentoObj, historialValores = []) {
  const porcentaje = aumentoObj.porcentaje;
  const tipo = aumentoObj.tipo;

  const factor = 1 + (porcentaje / 100);

  if (tipo === "acumulativo") {
    // si hay historial, usar último valor
    const base = historialValores.length > 0
      ? historialValores[historialValores.length - 1]
      : valorBase;

    return +(base * factor).toFixed(2);
  }

  // NO acumulativo → siempre sobre valor base original
  return +(valorBase * factor).toFixed(2);
};

//    RESETEAR FORM
function resetAumentoForm() {
  document.getElementById("aumentoForm").reset();
  document.getElementById("mesesContainer").innerHTML = "";

  document.getElementById("guardarAumento").style.display = "inline-block";
  document.getElementById("guardarAumentoEdit").style.display = "none";
  document.getElementById("cancelarAumento").style.display = "none";

  document.getElementById("aumentoIdEdit").value = "";
}

window.loadAumentoForm = loadAumentoForm;
