if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}

let valorHoraBaseGlobal = null;


console.log("renderer-facturacion.js cargado correctamente");

window._facturacionInitialized = false;

// Inicializar los eventos del DOM cuando esté listo
document.addEventListener("DOMContentLoaded", () => {
  initializeGestionFacturacionBtn();
  setupFacturacionListeners();
});

document.addEventListener("DOMContentLoaded", function () {
  const inputValorHora = document.getElementById("inputValorHora");
  const inputAumento = document.getElementById("inputAumento");

  if (inputValorHora) {
    inputValorHora.addEventListener("input", () => {
      // Permitir solo dígitos, punto o coma
      inputValorHora.value = inputValorHora.value.replace(/[^0-9.,]/g, '');
    });

    inputValorHora.addEventListener("blur", () => {
      let valor = parseFloat(
        inputValorHora.value.replace(/\./g, '').replace(',', '.')
      ) || 0;

      // Mostrar con dos decimales
      inputValorHora.value = valor.toFixed(2);
    });
  }
}
);

function setupAumentoInput() {
  const inputAumento = document.getElementById('inputAumento');
  if (!inputAumento) return;

  inputAumento.addEventListener('input', function (e) {
    // Permitir solo números y un punto decimal
    let value = e.target.value.replace(/[^0-9.]/g, '');

    // Manejar múltiples puntos
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limitar a 2 decimales
    if (parts.length > 1) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    e.target.value = value;
    e.target.dataset.rawValue = value; // Guardar valor sin formato

    // Mover cursor al final
    setTimeout(() => {
      e.target.selectionStart = e.target.selectionEnd = value.length;
    }, 0);
  });

  inputAumento.addEventListener('blur', function (e) {
    const value = parseFloat(e.target.value) || 0;
    e.target.value = value.toFixed(2);
    e.target.dataset.rawValue = value.toString();
  });
}

// Versión mejorada del inicializador
function initializeGestionFacturacionBtn() {
  const btn = document.getElementById("gestionarFacturacion");
  if (!btn) {
    console.warn("Botón 'Gestionar Facturación' no encontrado");
    return;
  }

  // Remover cualquier listener previo
  btn.removeEventListener('click', handleFacturacionClick);

  // Agregar nuevo listener
  btn.addEventListener('click', handleFacturacionClick);

  // Marcar como inicializado
  window._facturacionInitialized = true;
}

const inputValorHora = document.getElementById('inputValorHora');
if (inputValorHora) {
  inputValorHora.addEventListener('blur', () => {
    const valor = parseFloat(inputValorHora.value.replace(/[^0-9.]/g, '')) || 0;
    inputValorHora.value = formatoMonetario(valor);
  });

  inputValorHora.addEventListener("input", () => {
    // Reemplaza la coma por punto
    inputValorHora.value = inputValorHora.value.replace(",", ".");

    // Solo permite números y un punto
    inputValorHora.value = inputValorHora.value.replace(/[^0-9.]/g, '');

    // Si hay más de un punto, solo deja el primero
    const parts = inputValorHora.value.split('.');
    if (parts.length > 2) {
      inputValorHora.value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Formatear como moneda en cada cambio
    const valor = parseFloat(inputValorHora.value.replace(/[^0-9.]/g, '')) || 0;
    inputValorHora.value = formatoMonetario(valor);
  });
}

// Asegurar que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {

  const inputAumento = document.getElementById('inputAumento');

  if (!inputAumento) {
    console.warn('inputAumento todavía no existe, se activará cuando se cargue el formulario.');
    return; // ⛔ Frenamos acá para evitar errores
  }

  // --- Evento INPUT (validación mientras escribe) ---
  inputAumento.addEventListener('input', function () {
    let newValue = this.value.replace(',', '.');

    if (newValue && !isNaN(newValue)) {
      const parts = newValue.split('.');
      if (parts.length > 1) {
        newValue = `${parts[0]}.${parts[1].slice(0, 2)}`;
      }

      this.value = newValue;

      const event = new Event('change');
      this.dispatchEvent(event);
    } else if (newValue !== '') {
      this.value = this.value.slice(0, -1);
    }
  });

  // --- Evento BLUR (cuando sale del input) ---
  inputAumento.addEventListener('blur', function () {
    let valor = this.value.replace(',', '.');
    const parsedValor = parseFloat(valor);

    if (isNaN(parsedValor) || parsedValor < 0) {
      this.value = '';
    } else {
      this.value = parsedValor.toFixed(2);
    }
  });

});

const topes = {
  "Felipe Nogales": {
    mensual: 4441534.77,
    anual: 53298417.30
  },
  "Aylen Nogales": {
    mensual: 2447891.32,
    anual: 29374695.90
  },
  "Maximiliano Nogales": {
    mensual: 1953265.86,
    anual: 23439190.34
  },
  "Sandra Cordoba": {
    mensual: 2447891.32,
    anual: 29374695.90
  },
  "Omar": {
    mensual: 651088.62,
    anual: 7813063.45
  }
  // SAS no se incluye porque no tiene tope
};

function handleFacturacionClick() {
  console.log("Botón 'Gestionar Facturación' presionado");
  try {
    if (!window.loadFacturacionForm) {
      throw new Error("Función loadFacturacionForm no disponible");
    }

    if (!document.getElementById("div3")) {
      throw new Error("Contenedor div3 no encontrado");
    }

    window.loadFacturacionForm();
  } catch (error) {
    console.error("Error al manejar click:", error);
    showNotification("Error al cargar facturación", "error");
  }
}

// Función para cargar el formulario de facturación
function loadFacturacionForm() {
  const div3 = document.getElementById("div3");
  if (!div3) {
    console.error("Contenedor div3 no encontrado");
    return;
  }

  div3.innerHTML = `
    <h2>Gestión de Facturación</h2>
    
    <!-- Filtros -->
    <div class="filters">
  <input type="month" id="filterMonth">

  <button id="applyFilters" class="btn-filter">Filtrar</button>
  <button id="nuevaFacturacionBtn" class="btn-primary">+ Nueva Facturación</button>
</div>

    
    <!-- FORMULARIO COMPLETO -->
      <form id="facturacionForm" style="display:none;">
        <div class="form-section">
      <h3>Información Básica</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="inputPeriodo">Período (Mes)*</label>
          <input type="month" id="inputPeriodo" required>
        </div>
        
        <div class="form-group">
          <label for="inputCliente">Cliente*</label>
          <input type="text" id="inputCliente" list="clientesList">
          <datalist id="clientesList"></datalist>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="inputServicio">Servicio*</label>
          <input type="text" id="inputServicio" list="serviciosList">
          <datalist id="serviciosList"></datalist>
        </div>
        
        <div class="form-group">
          <label for="inputFacturante">Facturante*</label>
          <input type="text" id="inputFacturante" list="facturantesList">
          <datalist id="facturantesList"></datalist>
        </div>
        <div class="form-group">
          <label for="inputFechaEmision">Fecha de Emisión</label>
          <input type="date" id="inputFechaEmision" class="form-control" required />
        </div>
    </div>
    </div>

    <div class="form-section">
      <h3>Detalles de Horas</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="inputHsTrabajadas">Horas Trabajadas*</label>
          <input type="number" id="inputHsTrabajadas" min="0" step="any" required>
        </div>
        
        <div class="form-group">
          <label for="inputHsMes">Horas del mes*</label>
          <input type="number" id="inputHsMes" min="0" step="any" required>
        </div>
  
        <div class="form-group">
          <label for="inputHsLiquidadas">Horas Liquidadas*</label>
          <input type="number" id="inputHsLiquidadas" min="0" step="any" required>
        </div>
  
        <div class="form-group">
          <label for="inputHsAdeudadas">Horas adeudadas*</label>
          <input type="number" id="inputHsAdeudadas" min="0" step="any" required>
        </div>
      </div>
    </div>
    
    <div class="form-section">
  <h3>Valores Monetarios</h3>
  
  <div class="form-row">
    <div class="form-group">
      <label for="inputValorHora">Valor Hora ($)*</label>
      <input type="number" id="inputValorHora" step="0.01" required>
    </div>
    
    <div class="form-group">
      <label for="inputAumento">Aumento (%)</label>
      <input type="number" id="inputAumento" step="0.01" value="0">
    </div>

    <div class="form-group">
      <label for="inputValorHoraAumentado">Valor Hora con aumento ($)</label>
      <input type="number" id="inputValorHoraAumentado" readonly>
    </div>
  </div>
</div>
    
    <div class="form-section">
      <h3>Datos de Factura</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="inputTipoFactura">Tipo Factura*</label>
          <select id="inputTipoFactura" required>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="fceA">FCE-A</option>
            <option value="fceB">FCE-B</option>
            <option value="noSeFactura">No se factura</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="inputNroFactura">N° Factura</label>
          <input type="text" id="inputNroFactura">
        </div>
        <label style="display: flex; align-items: center; gap: 4px; font-weight: normal;">
      <input type="checkbox" id="checkExento">
      Exento
    </label>
      </div>
    </div>
    
    <div class="form-section">
      <h3>Cálculos Automáticos</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="inputNeto">Neto ($)</label>
          <input type="text" id="inputNeto" readonly>
        </div>
        
        <div class="form-group">
          <label for="inputIVA">IVA ($)</label>
          <input type="text" id="inputIVA" readonly>
        </div>
        
        <div class="form-group">
          <label for="inputTotal">Total ($)</label>
          <input type="text" id="inputTotal" readonly>
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary">Guardar Facturación</button>
      <button type="button" id="cancelarFacturacion" class="btn-secondary">Cancelar</button>
    </div>
  </form>
    
    <!-- Tabla resumen -->
    <table id="facturacionTable" class="styled-table">
      <thead>
        <tr>
          <th>Período</th>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Facturante</th>
          <th>Fecha Emisión</th>
          <th>Hs. trabajadas</th>
          <th>Hs. del mes</th>
          <th>Hs. liquidadas</th>
          <th>Hs. adeudadas</th>
          <th>Valor hora</th>
          <th>Aumento</th>
          <th>Tipo</th>
          <th>N° Factura</th>
          <th>Neto</th>
          <th>IVA</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="facturacionTableBody"></tbody>
    </table>
    `;


  const checkExento = document.getElementById("checkExento");
  const tipoFacturaInput = document.getElementById("inputTipoFactura");

  if (checkExento) {
    checkExento.addEventListener("change", calcularTotales);
  }

  if (tipoFacturaInput) {
    tipoFacturaInput.addEventListener("change", calcularTotales);
  }


  document.getElementById("applyFilters").addEventListener("click", async () => {
    const month = document.getElementById("filterMonth").value;
    if (!month) {
      showNotification("⚠️ Seleccioná un mes para filtrar", "warning");
      return;
    }
    const facturaciones = await ipcRenderer.invoke("get-facturacion", { month });
    cargarFacturacionEnTabla(facturaciones); // Asegurate de tener esta función
  });

  function formatoFechaYYYYMMDD(fechaStr) {
    if (!fechaStr) return '-';
    const [a, m, d] = fechaStr.split('-');
    return `${d}/${m}/${a}`;
  }


  document.getElementById("inputValorHora").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(",", ".");
  });


  // Configurar eventos después de que el DOM se haya actualizado
  setTimeout(() => {
    try {
      setupFacturacionEvents();
      loadAutocompleteData();
      loadFacturacionData();

      // Configurar filtro por mes
      const filterBtn = document.getElementById('applyFilters');
      if (filterBtn) {
        filterBtn.addEventListener('click', () => {
          const month = document.getElementById('filterMonth').value;
          loadFacturacionData(month);
        });
      }

      // Configurar autocompletado para facturación
      setupFacturacionAutocomplete();
    } catch (error) {
      console.error('Error inicializando facturación:', error);
    }
  }, 50);
}
window.loadFacturacionForm = loadFacturacionForm;

// Función para configurar eventos de facturación
function setupFacturacionEvents() {
  // Botón para mostrar formulario
  const nuevaFactBtn = document.getElementById('nuevaFacturacionBtn');
  if (nuevaFactBtn) {
    nuevaFactBtn.addEventListener('click', () => {
      const form = document.getElementById('facturacionForm');
      if (form) {
        form.style.display = 'block';
        nuevaFactBtn.style.display = 'none';
      }
    });
  }

  // Botón cancelar
  const cancelarBtn = document.getElementById('cancelarFacturacion');
  if (cancelarBtn) {
    cancelarBtn.addEventListener('click', () => {
      const form = document.getElementById('facturacionForm');
      if (form) {
        form.reset();
        form.style.display = 'none';
      }
      if (nuevaFactBtn) {
        nuevaFactBtn.style.display = 'block';
      }
    });
  }

  // Campos que recalculan automáticamente
  const calcFields = [
    'inputHsLiquidadas',
    'inputValorHora',
    'inputHsTrabajadas',
    'inputAumento',
    'inputTipoFactura'
  ];

  calcFields.forEach(field => {
    const input = document.getElementById(field);
    if (input) {
      input.addEventListener('input', calcularTotales);
      input.addEventListener('change', calcularTotales);
    }
  });

  // Formatear valor hora al perder foco
  const inputValorHora = document.getElementById('inputValorHora');
  if (inputValorHora) {
    inputValorHora.addEventListener('blur', (e) => {
      const valorNumerico = getNumber('inputValorHora');
      e.target.value = formatoMonetario(valorNumerico);
    });
  }

  // Traer valor hora automáticamente al seleccionar servicio + aplicar aumentos
  const inputServicio = document.getElementById("inputServicio");
  if (inputServicio) {
    inputServicio.addEventListener("change", async () => {
      const servicioSeleccionado = inputServicio.value;

      // ✅ SOLUCIÓN: Obtener el servicio actualizado desde servicios.json
      let servicioActualizado;
      try {
        const servicios = await ipcRenderer.invoke("get-servicios-autocomplete");
        servicioActualizado = servicios.find(s => s.nombre === servicioSeleccionado);
      } catch (error) {
        console.error("Error al obtener servicio actualizado:", error);
        return;
      }

      if (!servicioActualizado) {
        console.warn("⚠️ Servicio no encontrado:", servicioSeleccionado);
        return;
      }

      const inputValorHora = document.getElementById("inputValorHora");
      const valorHoraBase = servicioActualizado.valorHora || 0; // ✅ Usa el valor ACTUALIZADO
      const gremio = servicioActualizado.gremio;

      // Debug: verificar que estamos usando el valor correcto
      console.log("🔄 Servicio seleccionado:", {
        nombre: servicioSeleccionado,
        valorHoraBase_actualizado: valorHoraBase,
        gremio: gremio
      });

      // Guardamos la base globalmente
      valorHoraBaseGlobal = valorHoraBase;

      // 1) Tomar el periodo elegido en la facturación
      const periodo = document.getElementById("inputPeriodo").value; // formato YYYY-MM

      // Siempre mostramos el valor HORA BASE ACTUALIZADO en el inputValorHora
      if (inputValorHora) inputValorHora.value = valorHoraBase.toFixed(2);

      if (!periodo) {
        // Si no hay periodo aún, limpiamos campo aumentado y recalculamos
        const inputValorHoraAumentado = document.getElementById("inputValorHoraAumentado");
        if (inputValorHoraAumentado) inputValorHoraAumentado.value = valorHoraBase.toFixed(2);
        calcularTotales();
        return;
      }

      // 2) Buscar aumento aplicable (usando el PERIODO seleccionado)
      const aumento = await window.getAumentoAplicable(gremio, periodo);

      if (!aumento) {
        // Sin aumento proyectado → mostrar base en el input de valor aumentado
        const inputValorHoraAumentado = document.getElementById("inputValorHoraAumentado");
        if (inputValorHoraAumentado) inputValorHoraAumentado.value = valorHoraBase.toFixed(2);

        // Aseguramos el inputAumento en 0
        const inputAumento = document.getElementById("inputAumento");
        if (inputAumento) inputAumento.value = 0;

        // Guardar TEMPORAL para el guardado final
        window._ultimoAumentoAplicado = null;

        calcularTotales();
        return;
      }

      // 3) Calcular valor hora aumentado (acumulativo / no acumulativo ya lo maneja calcularValorHoraAumentado)
      const valorAumentado = window.calcularValorHoraAumentado(valorHoraBase, aumento, []);

      // Debug: verificar cálculo correcto
      console.log("📌 Aumento aplicado:", {
        porcentaje: aumento.porcentaje + "%",
        sobre_valor_base: valorHoraBase,
        resultado: valorAumentado
      });

      // 4) **IMPORTANTE**: NO sobrescribir inputValorHora (ese siempre el base actualizado)
      //    En vez de eso, colocamos el resultado en el campo dedicado:
      const inputValorHoraAumentado = document.getElementById("inputValorHoraAumentado");
      if (inputValorHoraAumentado) inputValorHoraAumentado.value = valorAumentado.toFixed(2);

      // 5) Mostrar el porcentaje de aumento en el input correspondiente (si existe)
      const inputAumento = document.getElementById("inputAumento");
      if (inputAumento) inputAumento.value = aumento.porcentaje;

      // 6) Guardar TEMPORALMENTE la info del aumento aplicado para usarla al guardar factura
      window._ultimoAumentoAplicado = {
        ...aumento,
        valorBase: valorHoraBase,
        valorFinal: valorAumentado,
        esUltimoMes: window.esUltimoMesAumento(aumento, periodo)
      };

      // 7) Recalcular totales (usa inputValorHora base y/o inputValorHoraAumentado según tu lógica)
      calcularTotales();
    });
  }

  // Mostrar valor hora aumentado automáticamente
  const inputAumento = document.getElementById('inputAumento');
  if (inputAumento) {
    inputAumento.addEventListener('input', () => {
      const valorHora = getNumber('inputValorHora');
      const aumento = getNumber('inputAumento'); // porcentaje
      const aumentado = valorHora * (1 + (aumento / 100));

      const inputValorHoraAumentado = document.getElementById('inputValorHoraAumentado');
      if (inputValorHoraAumentado) {
        inputValorHoraAumentado.value = aumentado.toFixed(2);
      }
    });
  }

  // Guardar facturación
  const facturacionForm = document.getElementById('facturacionForm');
  if (facturacionForm) {
    facturacionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarFacturacion();
    });
  }
}

function setupRecalculoAumento() {
  const campos = [
    "inputPeriodo",
    "inputServicio",
    "inputValorHora",
    "inputFechaEmision",
    "inputCliente"
  ];

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", aplicarAumento);
      el.addEventListener("input", aplicarAumento);
    }
  });
}

// Llamar al final de setupFacturacionEvents()
setupRecalculoAumento();


function setupValorHoraConAumento() {
  const recalcular = () => window.aplicarAumento();

  const campos = [
    "inputPeriodo",
    "inputServicio",
    "inputCliente",
    "inputValorHora",
    "inputFacturante",
    "inputFechaEmision",
    "inputHsTrabajadas",
    "inputHsMes",
    "inputHsLiquidadas",
    "inputHsAdeudadas"
  ];

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", recalcular);
      el.addEventListener("input", recalcular);
    }
  });
}


const camposNumericos = [
  'inputValorHora',
  'inputAumento',
  'inputHsTrabajadas',
  'inputHsLiquidadas'
];

camposNumericos.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', calcularTotales); // solo recalcular

    input.addEventListener('blur', () => {
      const valor = getNumber(id);
      input.value = formatoMonetario(valor);
    });
  }
});

function calcularTotales() {
  const valorHora = parseFloat(document.getElementById('inputValorHora').value.replace(/[^0-9.]/g, '')) || 0;
  const hsTrabajadas = parseFloat(document.getElementById('inputHsTrabajadas').value) || 0;
  const hsLiquidadas = parseFloat(document.getElementById('inputHsLiquidadas').value) || 0;
  const aumento = parseFloat(document.getElementById('inputAumento').value.replace(/[^0-9.]/g, '')) || 0;
  const tipoFacturaInput = document.getElementById('inputTipoFactura');
  const hsAdeudadasInput = document.getElementById('inputHsAdeudadas');
  const inputNeto = document.getElementById('inputNeto');
  const inputIVA = document.getElementById('inputIVA');
  const inputTotal = document.getElementById('inputTotal');
  const checkExento = document.getElementById('checkExento'); // 👈 nuevo

  const tipoFactura = tipoFacturaInput?.value || 'A';

  // Calcular horas adeudadas
  const hsAdeudadas = hsLiquidadas - hsTrabajadas;
  hsAdeudadasInput.value = hsAdeudadas.toFixed(1);
  hsAdeudadasInput.classList.remove('negativo', 'positivo');

  if (hsAdeudadas < 0) {
    hsAdeudadasInput.classList.add('positivo');
  } else if (hsAdeudadas > 0) {
    hsAdeudadasInput.classList.add('negativo');
  }

  // Cálculo de valor hora aumentado con redondeo correcto
  const valorHoraAumentado = parseFloat(valorHora * (1 + aumento / 100)).toFixed(4);
  const valorHoraAumentadoRedondeado = Math.round(valorHoraAumentado * 100) / 100; // Redondea a 2 decimales

  // Neto base imponible
  const netoBase = parseFloat((valorHoraAumentadoRedondeado * hsLiquidadas).toFixed(2));

  let neto, iva, total;

  if (checkExento && checkExento.checked) {
    // 👉 Caso EXENTO
    total = parseFloat((netoBase * 1.21).toFixed(2));
    iva = 0;
    neto = total; // Se muestra el total en el campo Neto
  } else {
    // 👉 Caso normal
    iva = (tipoFactura !== 'C' && tipoFactura !== 'noSeFactura')
      ? parseFloat((netoBase * 0.21).toFixed(2))
      : 0;
    neto = netoBase;
    total = parseFloat((neto + iva).toFixed(2));
  }

  // Asignar valores formateados
  inputNeto.value = formatoMonetario(neto);
  inputNeto.dataset.valorExacto = neto.toFixed(2);

  inputIVA.value = formatoMonetario(iva);
  inputIVA.dataset.valorExacto = iva.toFixed(2);

  inputTotal.value = formatoMonetario(total);
  inputTotal.dataset.valorExacto = total.toFixed(2);
}


function formatoMonetario(num) {
  // Asegurarse de que el número esté redondeado a 2 decimales
  const numRedondeado = Math.round(parseFloat(num) * 100) / 100;
  return numRedondeado.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Event listeners para permitir el uso de punto y coma y validar correctamente los decimales
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', function () {
    // Reemplazar coma por punto solo para asegurar que no haya confusión
    let value = this.value.replace(',', '.');

    // Validación de decimales: máximo dos decimales
    if (value.includes('.')) {
      let partes = value.split('.');
      if (partes[1].length > 2) {
        value = `${partes[0]}.${partes[1].slice(0, 2)}`;
      }
    }
    this.value = value; // Asignar el valor formateado pero sin aplicar el formato monetario
  });

  input.addEventListener('keydown', function (e) {
    const validKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
    const key = e.key;

    if (key === ',' || key === '.') {
      return; // Permitimos que el usuario escriba una coma o un punto
    }

    if (validKeys.includes(key) || !/[0-9]/.test(key)) {
      return; // Permitimos las teclas de control y otros caracteres
    }

    e.preventDefault(); // Evitar que se escriban caracteres no válidos
  });
});

async function guardarFacturacion() {
  const submitBtn = document.querySelector('#facturacionForm [type="submit"]');
  if (!submitBtn) return;

  const originalBtnText = submitBtn.textContent;
  
  // ✅ CORRECCIÓN: Verificar correctamente si es edición
  const esEdicion = window._facturacionEditando !== null && 
                    window._facturacionEditando !== undefined && 
                    window._facturacionEditando !== '';

  console.log('🔍 Estado de edición:', {
    esEdicion: esEdicion,
    _facturacionEditando: window._facturacionEditando
  });

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = esEdicion ? 'Actualizando...' : 'Guardando...';

    const formatCurrency = (value) => {
      const num = parseFloat(value) || 0;
      return parseFloat(num.toFixed(2));
    };

    const clienteSeleccionado = document.getElementById('inputCliente').value.trim();
    const cuitCliente = await obtenerCuitCliente(clienteSeleccionado);

    // Obtener datos del servicio para actualizar el valor hora
    const servicioNombre = document.getElementById('inputServicio').value.trim();
    const valorHoraAumentado = parseFloat(document.getElementById('inputValorHoraAumentado').value) || 0;
    const aumentoAplicado = window._ultimoAumentoAplicado;

    // Construir objeto facturación
    const facturacion = {
      id: esEdicion ? window._facturacionEditando : parseInt(Date.now().toString()),
      periodo: document.getElementById('inputPeriodo').value,
      cliente: clienteSeleccionado,
      cuit: cuitCliente,
      servicio: servicioNombre,
      facturante: document.getElementById('inputFacturante').value.trim(),
      fechaEmision: document.getElementById('inputFechaEmision')?.value || new Date().toISOString().split('T')[0],
      horas: {
        trabajadas: formatCurrency(document.getElementById('inputHsTrabajadas').value),
        mes: formatCurrency(document.getElementById('inputHsMes').value),
        liquidadas: formatCurrency(document.getElementById('inputHsLiquidadas').value),
        adeudadas: formatCurrency(document.getElementById('inputHsAdeudadas').value)
      },
      valores: {
        hora: document.getElementById('inputValorHora').value,
        aumento: document.getElementById('inputAumento').value,
        neto: formatCurrency(document.getElementById('inputNeto').dataset.valorExacto),
        iva: formatCurrency(document.getElementById('inputIVA').dataset.valorExacto),
        total: formatCurrency(document.getElementById('inputTotal').dataset.valorExacto),
        horaAumentada: valorHoraAumentado
      },
      factura: {
        tipo: document.getElementById('inputTipoFactura').value,
        numero: document.getElementById('inputNroFactura').value.trim() || null
      },
      fechaRegistro: new Date().toISOString(),
      estado: 'pendiente',
      aumentoAplicado: aumentoAplicado ? {
        gremio: aumentoAplicado.gremio,
        tipo: aumentoAplicado.tipo,
        porcentaje: aumentoAplicado.porcentaje,
        mes: aumentoAplicado.mes,
        esUltimoMes: aumentoAplicado.esUltimoMes
      } : null
    };

    if (!validarFacturacion(facturacion)) {
      showNotification('❌ Por favor complete todos los campos requeridos', 'error');
      return;
    }

    console.log('📦 Objeto a guardar:', {
      esEdicion: esEdicion,
      id: facturacion.id,
      accion: esEdicion ? 'ACTUALIZAR' : 'CREAR NUEVA'
    });

    // ✅ CORRECCIÓN: Actualizar valor hora según el tipo REAL de aumento
    if (aumentoAplicado) {
      try {
        if (aumentoAplicado.tipo === "sobre-saldos") {
          // SOBRE SALDOS: Actualizar SIEMPRE después de facturar
          console.log("🔄 Actualizando servicio (sobre saldos):", {
            nombre: servicioNombre,
            valor_anterior: document.getElementById('inputValorHora').value,
            nuevo_valor: valorHoraAumentado,
            periodo: facturacion.periodo
          });
          
          const resultadoActualizacion = await ipcRenderer.invoke('actualizar-valor-hora-servicio', {
            nombre: servicioNombre,
            nuevoValorHora: valorHoraAumentado,
            gremio: aumentoAplicado.gremio,
            periodo: facturacion.periodo
          });
          
          if (resultadoActualizacion.success) {
            console.log('✅ Valor hora del servicio actualizado (sobre saldos)');
          } else {
            console.error('❌ Error actualizando servicio:', resultadoActualizacion.error);
          }
          
        } else if (aumentoAplicado.tipo === "acumulativo" && aumentoAplicado.esUltimoMes) {
          // ACUMULATIVO: Actualizar SOLO en el ÚLTIMO mes de la paritaria
          console.log("🎯 Actualizando servicio (acumulativo - último mes):", {
            nombre: servicioNombre,
            valor_anterior: document.getElementById('inputValorHora').value,
            nuevo_valor: valorHoraAumentado,
            periodo: facturacion.periodo,
            es_ultimo_mes: true
          });
          
          const resultadoActualizacion = await ipcRenderer.invoke('actualizar-valor-hora-servicio', {
            nombre: servicioNombre,
            nuevoValorHora: valorHoraAumentado,
            gremio: aumentoAplicado.gremio,
            periodo: facturacion.periodo
          });
          
          if (resultadoActualizacion.success) {
            console.log('✅ Valor hora del servicio actualizado (acumulativo - último mes)');
          } else {
            console.error('❌ Error actualizando servicio:', resultadoActualizacion.error);
          }
          
        } else if (aumentoAplicado.tipo === "acumulativo") {
          console.log("ℹ️  Servicio NO actualizado (acumulativo - no es último mes)");
        }
      } catch (error) {
        console.error('❌ Error en actualización servicio:', error);
      }
    }

    // ✅ CORRECCIÓN: Usar el IPC correcto según si es edición o creación
    const ipcMethod = esEdicion ? 'actualizar-facturacion' : 'guardar-facturacion';
    console.log('📡 Llamando IPC:', ipcMethod);

    const resultado = await ipcRenderer.invoke(ipcMethod, facturacion);

    if (resultado.success) {
      showNotification(esEdicion ? '✅ Facturación actualizada correctamente' : '✅ Facturación guardada correctamente');
      
      // Resetear formulario y limpiar edición
      cancelarEdicion();
      
      await loadFacturacionData();
      await verificarTopeFacturante(facturacion);
      await verificarTopeAnualFacturante(facturacion);

    } else {
      showNotification(`❌ Error: ${resultado.error || 'Error desconocido'}`, 'error');
    }
  } catch (error) {
    console.error('Error al guardar facturación:', error);
    showNotification(`❌ Error al guardar: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

async function verificarTopeFacturante(nuevaFacturacion) {
  const { facturante, periodo } = nuevaFacturacion;

  // Obtener todas las facturaciones del periodo para ese facturante
  let facturaciones = [];
  try {
    facturaciones = await ipcRenderer.invoke('get-facturacion');
  } catch (err) {
    console.error("Error al cargar facturaciones:", err);
    return;
  }

  const delMismoFacturante = facturaciones.filter(f =>
    f.facturante === facturante && f.periodo === periodo
  );

  const totalFacturado = delMismoFacturante.reduce((sum, f) => sum + (f.valores.total || 0), 0);

  // Obtener tope desde facturantes.json
  let facturantesData = [];
  try {
    facturantesData = await ipcRenderer.invoke('get-facturantes');
  } catch (err) {
    console.error("Error al cargar facturantes.json:", err);
    return;
  }

  const datosFacturante = facturantesData.find(f => f.nombre === facturante);
  if (!datosFacturante || !datosFacturante.topeMensual) return;

  const tope = datosFacturante.topeMensual;
  const porcentaje = (totalFacturado / tope) * 100;

  if (porcentaje >= 100) {
    const sugerido = await buscarFacturanteConMenorFacturacion(periodo, facturante);
    mostrarNotificacion(`🚨 ${facturante} superó su tope mensual.\nRecomendado: ${sugerido}`, "error");
  } else if (porcentaje >= 80) {
    mostrarNotificacion(`⚠️ ${facturante} ha alcanzado el ${porcentaje.toFixed(1)}% de su tope mensual.`, "warning");
  }
}

async function buscarFacturanteConMenorFacturacion(periodo, excluir = "") {
  let facturaciones = [];
  try {
    facturaciones = await ipcRenderer.invoke('get-facturacion');
  } catch (err) {
    console.error("Error al cargar facturaciones:", err);
    return "Desconocido";
  }

  // Agrupar por facturante
  const sumaPorFacturante = {};
  facturaciones
    .filter(f => f.periodo === periodo)
    .forEach(f => {
      if (!sumaPorFacturante[f.facturante]) sumaPorFacturante[f.facturante] = 0;
      sumaPorFacturante[f.facturante] += f.valores.total || 0;
    });

  // Buscar el que menos facturó (excepto el actual)
  const candidatos = Object.entries(sumaPorFacturante).filter(([nombre]) => nombre !== excluir);
  if (candidatos.length === 0) return "Ninguno disponible";

  const [recomendado] = candidatos.reduce((min, actual) => actual[1] < min[1] ? actual : min);
  return recomendado;
}

async function verificarTopeAnualFacturante(nuevaFacturacion) {
  const { facturante, fechaEmision } = nuevaFacturacion;
  const fechaFactura = new Date(fechaEmision);
  const añoActual = fechaFactura.getFullYear();
  const inicioAño = new Date(`${añoActual}-01-01`);

  let facturaciones = [];
  try {
    facturaciones = await ipcRenderer.invoke('get-facturacion');
  } catch (err) {
    console.error("Error al cargar facturaciones.json:", err);
    return;
  }

  // Filtrar facturaciones del mismo facturante entre 1/1 y la fecha de emisión
  const delMismoFacturante = facturaciones.filter(f => {
    if (f.facturante !== facturante || !f.fechaEmision) return false;
    const fecha = new Date(f.fechaEmision);
    return fecha >= inicioAño && fecha <= fechaFactura;
  });

  const totalAnual = delMismoFacturante.reduce((sum, f) => sum + (f.valores?.total || 0), 0);

  let facturantesData = [];
  try {
    facturantesData = await ipcRenderer.invoke('get-facturantes');
  } catch (err) {
    console.error("Error al cargar facturantes.json:", err);
    return;
  }

  const datosFacturante = facturantesData.find(f => f.nombre === facturante);
  if (!datosFacturante || !datosFacturante.topeAnual) return;

  const tope = datosFacturante.topeAnual;
  const porcentaje = (totalAnual / tope) * 100;

  const mensaje = `
📅 Desde el 1 de enero al ${fechaFactura.toLocaleDateString()}
💰 Total facturado por ${facturante}: $${totalAnual.toLocaleString()}
📊 Porcentaje del tope anual: ${porcentaje.toFixed(2)}%
🔢 Tope anual: $${tope.toLocaleString()}
`;

  // Usar una ventana modal si querés más impacto visual:
  alert(mensaje);
}

// Función de validación mejorada
function validarFacturacion(fact) {
  const requiredFields = [
    { field: fact.periodo, message: "Período es requerido" },
    { field: fact.cliente, message: "Cliente es requerido" },
    { field: fact.servicio, message: "Servicio es requerido" },
    { field: fact.facturante, message: "Facturante es requerido" },
    { field: fact.horas.trabajadas, message: "Horas trabajadas deben ser mayores a 0" },
    { field: fact.valores.hora, message: "Valor hora debe ser mayor a 0" }
  ];

  const errores = requiredFields
    .filter(item => !item.field || (typeof item.field === 'number' && item.field <= 0))
    .map(item => item.message);

  if (errores.length > 0) {
    showNotification("❌ Errores:\n" + errores.join("\n"), 'error');
    return false;
  }
  return true;
}

async function loadFacturacionData(month = '') {
  try {
    const facturaciones = await ipcRenderer.invoke('get-facturacion', { month });
    const tbody = document.getElementById('facturacionTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!facturaciones || facturaciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="16" class="no-data">No hay facturaciones registradas</td></tr>`;
      return;
    }

    // 🔽 ORDENAR por fecha de emisión o registro (más nuevas primero)
    facturaciones.sort((a, b) => {
      const fechaA = new Date(a.fechaEmision || a.fechaRegistro || 0);
      const fechaB = new Date(b.fechaEmision || b.fechaRegistro || 0);
      return fechaB - fechaA;
    });

    facturaciones.forEach(fact => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="compact">${formatMonth(fact.periodo)}</td>
        <td class="compact">${fact.cliente}</td>
        <td class="compact">${fact.servicio}</td>
        <td class="compact">${fact.facturante}</td>
        <td class="compact">${fact.fechaEmision || '-'}</td>
        <td class="compact number">${fact.horas.trabajadas}</td>
        <td class="compact number">${fact.horas.mes}</td>
        <td class="compact number">${fact.horas.liquidadas}</td>
        <td class="compact number">${fact.horas.adeudadas}</td>
        <td class="compact currency">${formatoMonetario(fact.valores.hora)}</td>
        <td class="compact number">${fact.valores.aumento}%</td>
        <td class="compact center">${fact.factura.tipo}</td>
        <td class="compact center">${fact.factura.numero || '-'}</td>
        <td class="compact currency">${formatoMonetario(fact.valores.neto)}</td>
        <td class="compact currency">${formatoMonetario(fact.valores.iva)}</td>
        <td class="compact currency">${formatoMonetario(fact.valores.total)}</td>
        <td class="compact actions">
          <button class="edit-btn icon-btn" data-id="${fact.id}" title="Editar">✏️</button>
          <button class="delete-btn icon-btn" data-id="${fact.id}" title="Eliminar">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    setupDeleteButtons();
  } catch (error) {
    console.error('Error al cargar facturaciones:', error);
    const tbody = document.getElementById('facturacionTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="16" class="error-msg">Error al cargar facturaciones</td></tr>`;
    }
  }
  setupDeleteButtons();
  setupEditButtons();
}

// Función para configurar botones de edición
async function setupEditButtons() {
  const buttons = document.querySelectorAll('.edit-btn');
  if (!buttons.length) return;

  // Remover listeners anteriores para evitar duplicados
  buttons.forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (!id) {
        console.error('ID no encontrado en el botón editar');
        return;
      }

      try {
        // Obtener la facturación
        const facturaciones = await ipcRenderer.invoke('get-facturacion');
        const facturacion = facturaciones.find(f => f.id == id);

        if (!facturacion) {
          showNotification('❌ Facturación no encontrada', 'error');
          return;
        }

        // Cargar los datos en el formulario
        cargarFacturacionEnFormulario(facturacion);

      } catch (error) {
        console.error('Error al cargar facturación para editar:', error);
        showNotification('❌ Error al cargar facturación', 'error');
      }
    });
  });
}

// Función para cancelar edición
function cancelarEdicion() {
  const form = document.getElementById('facturacionForm');
  if (form) {
    form.reset();
    form.style.display = 'none';
  }

  const nuevaFactBtn = document.getElementById('nuevaFacturacionBtn');
  if (nuevaFactBtn) {
    nuevaFactBtn.style.display = 'block';
  }

  // Remover botón cancelar edición
  const cancelEditBtn = document.getElementById('cancelarEdicionBtn');
  if (cancelEditBtn) {
    cancelEditBtn.remove();
  }

  // Restaurar texto del botón
  const submitBtn = document.querySelector('#facturacionForm [type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'Guardar Facturación';
  }

  // Limpiar ID de edición
  window._facturacionEditando = null;

  showNotification('Edición cancelada', 'info');
}
// Función para cargar datos de facturación en el formulario
function cargarFacturacionEnFormulario(facturacion) {
  try {
    console.log('🔄 Cargando facturación en formulario:', facturacion);

    // Mostrar el formulario y ocultar botón "Nueva Facturación"
    const form = document.getElementById('facturacionForm');
    const nuevaFactBtn = document.getElementById('nuevaFacturacionBtn');

    if (form) {
      form.style.display = 'block';
    }
    if (nuevaFactBtn) {
      nuevaFactBtn.style.display = 'none';
    }

    // Llenar los campos del formulario
    document.getElementById('inputPeriodo').value = facturacion.periodo || '';
    document.getElementById('inputCliente').value = facturacion.cliente || '';
    document.getElementById('inputServicio').value = facturacion.servicio || '';
    document.getElementById('inputFacturante').value = facturacion.facturante || '';
    document.getElementById('inputFechaEmision').value = facturacion.fechaEmision || '';

    // Horas
    document.getElementById('inputHsTrabajadas').value = facturacion.horas?.trabajadas || 0;
    document.getElementById('inputHsMes').value = facturacion.horas?.mes || 0;
    document.getElementById('inputHsLiquidadas').value = facturacion.horas?.liquidadas || 0;
    document.getElementById('inputHsAdeudadas').value = facturacion.horas?.adeudadas || 0;

    // Valores
    document.getElementById('inputValorHora').value = facturacion.valores?.hora || 0;
    document.getElementById('inputAumento').value = facturacion.valores?.aumento || 0;
    document.getElementById('inputValorHoraAumentado').value = facturacion.valores?.horaAumentada || facturacion.valores?.hora || 0;

    // Factura
    document.getElementById('inputTipoFactura').value = facturacion.factura?.tipo || 'A';
    document.getElementById('inputNroFactura').value = facturacion.factura?.numero || '';

    // Checkbox Exento
    const checkExento = document.getElementById('checkExento');
    if (checkExento) {
      // Esto depende de cómo guardes la info de exento en tu facturación
      checkExento.checked = false; // Ajustar según tu lógica
    }

    // Guardar el ID de la facturación que se está editando
    window._facturacionEditando = facturacion.id;

    // Cambiar el texto del botón de guardar
    const submitBtn = document.querySelector('#facturacionForm [type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Actualizar Facturación';
    }

    // Agregar botón cancelar edición si no existe
    let cancelEditBtn = document.getElementById('cancelarEdicionBtn');
    if (!cancelEditBtn) {
      cancelEditBtn = document.createElement('button');
      cancelEditBtn.type = 'button';
      cancelEditBtn.id = 'cancelarEdicionBtn';
      cancelEditBtn.className = 'btn-secondary';
      cancelEditBtn.textContent = 'Cancelar Edición';
      cancelEditBtn.style.marginLeft = '10px';

      cancelEditBtn.addEventListener('click', cancelarEdicion);

      const formActions = document.querySelector('.form-actions');
      if (formActions) {
        formActions.appendChild(cancelEditBtn);
      }
    }

    // Recalcular totales para mostrar valores actualizados
    setTimeout(() => {
      calcularTotales();
    }, 100);

    showNotification(`✏️ Editando facturación ${facturacion.id}`, 'info');

  } catch (error) {
    console.error('Error al cargar facturación en formulario:', error);
    showNotification('❌ Error al cargar datos para editar', 'error');
  }
}

async function setupDeleteButtons() {
  const buttons = document.querySelectorAll('.delete-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    // Remover listeners anteriores para evitar duplicados
    btn.replaceWith(btn.cloneNode(true));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (!id) {
        console.error('ID no encontrado en el botón');
        return;
      }

      if (confirm('¿Estás seguro de eliminar esta facturación permanentemente?')) {
        try {
          // Mostrar loader
          e.target.innerHTML = '⌛';

          const result = await ipcRenderer.invoke('eliminar-facturacion', id);

          if (result.success) {
            showNotification(`✅ Facturación ${id} eliminada`);
            // Forzar recarga de datos
            await loadFacturacionData();
          } else {
            showNotification(`❌ ${result.error || 'Error al eliminar'}`, 'error');
            // Restaurar ícono original
            e.target.innerHTML = '🗑️';
          }
        } catch (error) {
          console.error('Error en eliminación:', error);
          showNotification('❌ Error al comunicar con el servidor', 'error');
          e.target.innerHTML = '🗑️';
        }
      }
    });
  });
}

function formatMonth(monthString) {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// APLICAR AUMENTO AUTOMÁTICAMENTE
window.aplicarAumento = async function () {
  try {
    const inputPeriodo = document.getElementById("inputPeriodo");
    const inputServicio = document.getElementById("inputServicio");
    const inputAumento = document.getElementById("inputAumento");
    const inputValorHora = document.getElementById("inputValorHora");

    if (!inputPeriodo || !inputServicio || !inputValorHora || !inputAumento) {
      console.warn("⏳ aplicarAumento(): esperando elementos del DOM...");
      return;
    }

    const periodo = inputPeriodo.value;          // YYYY-MM
    const servicioNombre = inputServicio.value;  // Texto

    if (!periodo || !servicioNombre) {
      inputAumento.value = 0;
      return;
    }

    // ✅ CORRECCIÓN: Obtener el servicio ACTUALIZADO para tener el valor hora correcto
    let servicioActualizado;
    let valorHoraBase;

    try {
      const servicios = await ipcRenderer.invoke("get-servicios-autocomplete");
      servicioActualizado = servicios.find(s => s.nombre === servicioNombre);

      if (servicioActualizado) {
        valorHoraBase = servicioActualizado.valorHora || 0;
        // Actualizar el inputValorHora con el valor actualizado
        inputValorHora.value = valorHoraBase.toFixed(2);
      } else {
        console.warn("⚠️ Servicio no encontrado:", servicioNombre);
        valorHoraBase = parseFloat(inputValorHora.value) || 0;
      }
    } catch (error) {
      console.error("Error al obtener servicio actualizado:", error);
      valorHoraBase = parseFloat(inputValorHora.value) || 0;
    }

    if (!servicioActualizado || !servicioActualizado.gremio) {
      console.log("⚠️ Servicio sin gremio definido");
      inputAumento.value = 0;
      return;
    }

    const gremio = servicioActualizado.gremio;
    console.log("🔍 Buscando aumento:", {
      gremio,
      periodo,
      servicio: servicioNombre,
      valorHoraBase: valorHoraBase
    });

    const aumento = await window.getAumentoAplicable(gremio, periodo);

    if (!aumento) {
      console.log("ℹ️ No hay aumento para este gremio y período");
      inputAumento.value = 0;

      // Mostrar valor base en el campo aumentado
      const inputValorHoraAumentado = document.getElementById("inputValorHoraAumentado");
      if (inputValorHoraAumentado) {
        inputValorHoraAumentado.value = valorHoraBase.toFixed(2);
      }

      // Limpiar aumento temporal
      window._ultimoAumentoAplicado = null;

      calcularTotales();
      return;
    }

    // Colocar el porcentaje en el input
    inputAumento.value = aumento.porcentaje;

    // ✅ CORRECCIÓN: Calcular valor hora aumentado usando el servicio ACTUALIZADO
    const valorAumentado = window.calcularValorHoraAumentado(valorHoraBase, aumento, []);

    const inputValorHoraAumentado = document.getElementById("inputValorHoraAumentado");
    if (inputValorHoraAumentado) {
      inputValorHoraAumentado.value = valorAumentado.toFixed(2);
    }

    // ✅ CORRECCIÓN: Guardar info del aumento aplicado (igual que en el evento change)
    window._ultimoAumentoAplicado = {
      ...aumento,
      valorBase: valorHoraBase,
      valorFinal: valorAumentado,
      esUltimoMes: aumento.esUltimoMes // ← Usar el esUltimoMes que ya calcula getAumentoAplicable
    };

    console.log(`📌 Aumento aplicado: ${aumento.porcentaje}% sobre ${valorHoraBase} = ${valorAumentado}`, {
      tipo: aumento.tipo,
      esUltimoMes: aumento.esUltimoMes
    });

    calcularTotales();

  } catch (err) {
    console.error("❌ Error en aplicarAumento:", err);
  }
};

// Hacerla global
window.aplicarAumento = aplicarAumento;

async function obtenerCuitCliente(nombreCliente) {
  try {
    const clientes = await ipcRenderer.invoke('get-clientes-autocomplete');
    const clienteEncontrado = clientes.find(c => c.nombre === nombreCliente);
    return clienteEncontrado ? clienteEncontrado.cuit : "N/A";
  } catch (error) {
    console.error('Error al obtener el CUIT del cliente:', error);
    return "N/A";
  }
}

// Configurar listeners IPC
function setupFacturacionListeners() {
  if (!window.ipcRenderer) {
    console.warn("ipcRenderer no está disponible");
    return;
  }

  // Limpiar listeners previos
  ipcRenderer.removeAllListeners([
    'facturacion-guardada',
    'facturacion-eliminada',
    'error-facturacion'
  ]);

  // Actualizar tabla cuando se guarda o elimina
  ipcRenderer.on('facturaciones-actualizadas', () => {
    loadFacturacionData();
  });

  ipcRenderer.on('facturacion-guardada', () => {
    showNotification('✅ Facturación guardada correctamente');
    const form = document.getElementById('facturacionForm');
    if (form) {
      form.style.display = 'none';
      form.reset();
    }
    const nuevaFactBtn = document.getElementById('nuevaFacturacionBtn');
    if (nuevaFactBtn) {
      nuevaFactBtn.style.display = 'block';
    }
    loadFacturacionData();
  });

  ipcRenderer.on('facturacion-eliminada', (event, success) => {
    if (success) {
      showNotification('✅ Facturación eliminada correctamente');
      loadFacturacionData();
    } else {
      showNotification('Error al eliminar la facturación', 'error');
    }
  });

  ipcRenderer.on('error-facturacion', (_, error) => {
    showNotification(`❌ Error: ${error}`, 'error');
  });
}
window.setupFacturacionListeners = setupFacturacionListeners;

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Funciones para autocompletado
async function setupFacturacionAutocomplete() {
  try {
    // Obtener datos para autocompletado
    const [clientes, servicios, facturantes] = await Promise.all([
      ipcRenderer.invoke('get-clientes-autocomplete'),
      ipcRenderer.invoke('get-servicios-autocomplete'),
      ipcRenderer.invoke('get-facturantes-autocomplete')
    ]);

    // Configurar datalists para facturación
    setupDatalist('clientesList', clientes);
    setupDatalist('serviciosList', servicios);
    setupDatalist('facturantesList', facturantes);

    console.log('Autocompletado para facturación configurado correctamente');
  } catch (error) {
    console.error('Error configurando autocompletado para facturación:', error);
  }
}

function setupDatalist(datalistId, items) {
  const datalist = document.getElementById(datalistId);
  if (!datalist) return;

  datalist.innerHTML = '';

  if (items && items.length > 0) {
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.nombre || item;
      datalist.appendChild(option);
    });
  }
}

async function loadAutocompleteData() {
  try {
    // Esperar a que los inputs existan
    await waitForElement('#inputCliente');
    await waitForElement('#inputServicio');
    await waitForElement('#inputFacturante');

    const clientes = await ipcRenderer.invoke('get-clientes-autocomplete');
    const servicios = await ipcRenderer.invoke('get-servicios-autocomplete');
    const facturantes = await ipcRenderer.invoke('get-facturantes-autocomplete');

    // Clientes y Facturantes siguen igual
    setupAutocomplete('inputCliente', 'clientesList', clientes);
    setupAutocomplete('inputFacturante', 'facturantesList', facturantes);


    // Servicios → generamos el datalist manualmente para guardar valorHora y gremio
    const serviciosList = document.getElementById('serviciosList');
    serviciosList.innerHTML = '';

    servicios.forEach(servicio => {
      const option = document.createElement('option');
      option.value = servicio.nombre;

      if (servicio.valorHora) {
        option.dataset.valorHora = servicio.valorHora;
      }

      if (servicio.gremio) {
        option.dataset.gremio = servicio.gremio;  // ⚡ NECESARIO
      }

      serviciosList.appendChild(option);
    });


  } catch (error) {
    console.error('Error cargando autocompletado:', error);
  }
  setupValorHoraConAumento();
}

function waitForElement(selector) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Elemento ${selector} no encontrado en el DOM`));
    }, 5000);
  });
}

function setupAutocomplete(inputId, datalistId, items) {
  const inputElement = document.getElementById(inputId);
  const datalistElement = document.getElementById(datalistId);

  if (!inputElement || !datalistElement) {
    console.error(`Elementos no encontrados para ${inputId}`);
    return;
  }

  // Limpiar datalist existente
  datalistElement.innerHTML = '';

  // Agregar opciones al datalist
  if (items && items.length > 0) {
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.nombre || item;
      datalistElement.appendChild(option);
    });
  } else {
    console.warn(`No se recibieron datos para ${inputId}`);
  }

  // Eliminar eventos previos para evitar duplicados
  const newInputElement = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInputElement, inputElement);

  // Configurar evento de input para filtrado dinámico
  newInputElement.addEventListener('input', () => {
    const searchTerm = newInputElement.value.toLowerCase();
    const options = datalistElement.querySelectorAll('option');

    options.forEach(option => {
      const optionText = option.value.toLowerCase();
      option.hidden = !optionText.includes(searchTerm);
    });
  });
}

function getNumber(id) {
  const input = document.getElementById(id);
  if (!input) return 0;

  let value = input.value;

  // 1. Eliminar separadores de miles (puntos o comas)
  // 2. Detectar y convertir el separador decimal correcto
  if (value.includes(',') && value.includes('.')) {
    // Supongamos formato europeo: 1.234,56
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (value.includes(',')) {
    // Solo coma: asumimos decimal (1.50 -> 1.50)
    value = value.replace(',', '.');
  } else {
    // Solo punto, está bien
    value = value;
  }

  const parsed = parseFloat(rawValue);
  return isNaN(parsed) ? 0 : parsed;
}

function prepararInputsFacturacion() {
  const inputValorHora = document.getElementById("inputValorHora");
  const inputAumento = document.getElementById("inputAumento");

  // Para el valor hora
  if (inputValorHora) {
    inputValorHora.addEventListener("input", () => {
      // Reemplazar coma por punto (para que coma no sea aceptada como decimal)
      inputValorHora.value = inputValorHora.value.replace(",", ".");

      // Filtrar solo números y un punto
      inputValorHora.value = inputValorHora.value.replace(/[^0-9.]/g, '');

      // Limitar a un solo punto decimal
      const parts = inputValorHora.value.split('.');
      if (parts.length > 2) {
        inputValorHora.value = parts[0] + '.' + parts.slice(1).join('');
      }
    });

    // Asegurarse de formatear el valor cuando el input pierde el foco
    inputValorHora.addEventListener("blur", () => {
      let valor = parseFloat(inputValorHora.value) || 0;

      // Aplicar formato con dos decimales
      inputValorHora.value = valor.toFixed(2);  // Solo dos decimales
    });
  }

  // Para el aumento
  if (inputAumento) {
    inputAumento.addEventListener("input", () => {
      // No modificar el valor en tiempo real: solo validamos que tenga dígitos, punto o coma
      inputAumento.value = inputAumento.value.replace(/[^0-9.,]/g, '');
    });

    inputAumento.addEventListener("blur", () => {
      let valor = parseFloat(
        inputAumento.value.replace(/\./g, '').replace(',', '.')
      ) || 0;

      // Mostrar con dos decimales al salir del input
      inputAumento.value = valor.toFixed(2);
    });


    // Asegurarse de formatear el valor cuando el input pierde el foco
    inputAumento.addEventListener("blur", () => {
      let valor = parseFloat(inputAumento.value) || 0;

      // Aplicar formato con dos decimales
      inputAumento.value = valor.toFixed(2);  // Solo dos decimales
    });
  }
}

