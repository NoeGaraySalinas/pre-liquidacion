if (!window.ipcRenderer) {
  window.ipcRenderer = require('electron').ipcRenderer;
}

if (!window.path) {
  window.path = require('path');
}

if (!window.fs) {
  window.fs = require('fs');
}

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
  
  if (inputAumento) {
    inputAumento.addEventListener('input', function() {
      // Reemplazar coma por punto y validar
      let newValue = this.value.replace(',', '.');
      
      // Validar que sea número válido
      if (newValue && !isNaN(newValue)) {
        // Validar máximo dos decimales
        const parts = newValue.split('.');
        if (parts.length > 1) {
          newValue = `${parts[0]}.${parts[1].slice(0, 2)}`;
        }
        
        // Actualizar valor
        this.value = newValue;
        
        // Disparar evento de cambio si es necesario
        const event = new Event('change');
        this.dispatchEvent(event);
      } else if (newValue !== '') {
        // Revertir si no es número válido
        this.value = this.value.slice(0, -1);
      }
    });
  } else {
    console.warn('Elemento inputAumento no encontrado');
  }
});

document.getElementById('inputAumento').addEventListener('blur', function () {
  let valor = this.value.replace(',', '.'); // Aseguramos que el valor tenga punto en lugar de coma
  const parsedValor = parseFloat(valor);

  if (isNaN(parsedValor) || parsedValor < 0) {
    this.value = ''; // Limpiar el campo si el valor no es válido
  } else {
    this.value = parsedValor.toFixed(2); // Asegurarse de que tenga 2 decimales
  }
});


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
          <input type="text" id="inputValorHora" required>
        </div>
        
        <div class="form-group">
          <label for="inputAumento">Aumento (%)</label>
          <input type="text" id="inputAumento" value="0">
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
  // Mostrar/ocultar formulario
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

  const inputHsLiquidadas = document.getElementById('inputHsLiquidadas');
  if (inputHsLiquidadas) {
    inputHsLiquidadas.addEventListener('input', calcularTotales);
  }

  const cancelarBtn = document.getElementById('cancelarFacturacion');
  if (cancelarBtn) {
    cancelarBtn.addEventListener('click', () => {
      const form = document.getElementById('facturacionForm');
      if (form) {
        form.style.display = 'none';
        form.reset();
      }
      if (nuevaFactBtn) {
        nuevaFactBtn.style.display = 'block';
      }
    });
  }
  let facturacionActual = {
    valores: {
      hora: 0
    }
  };

  // Cálculos automáticos
  const calcFields = ['inputValorHora', 'inputHsTrabajadas', 'inputAumento', 'inputTipoFactura'];
  calcFields.forEach(field => {
    const input = document.getElementById(field);
    if (input) {
      input.addEventListener('input', calcularTotales);
    }
  });

  const inputValorHora = document.getElementById('inputValorHora');
  if (inputValorHora) {
    let valorNumerico = 0;

    // Manejar entrada de datos
    inputValorHora.addEventListener('input', () => {
      calcularTotales();
    });

    inputValorHora.addEventListener('blur', (e) => {
      const valorNumerico = getNumber('inputValorHora');
      e.target.value = formatoMonetario(valorNumerico);
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

  console.log({ valorHora, aumento, tipo: typeof aumento });
  
  // Cálculo de valor hora aumentado con redondeo correcto
  const valorHoraAumentado = parseFloat(valorHora * (1 + aumento / 100)).toFixed(4);
  const valorHoraAumentadoRedondeado = Math.round(valorHoraAumentado * 100) / 100; // Redondea a 2 decimales
  
  // Cálculo de neto, IVA y total con el valor redondeado
  const neto = parseFloat((valorHoraAumentadoRedondeado * hsLiquidadas).toFixed(2));
  const iva = (tipoFactura !== 'C' && tipoFactura !== 'noSeFactura') ? parseFloat((neto * 0.21).toFixed(2)) : 0;
  const total = parseFloat((neto + iva).toFixed(2));

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

  try {
    // Deshabilitar botón durante el guardado
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    // Función para normalizar números con exactamente 2 decimales
    const formatCurrency = (value) => {
      const num = parseFloat(value) || 0;
      return parseFloat(num.toFixed(2));
    };

    const clienteSeleccionado = document.getElementById('inputCliente').value.trim();
    const cuitCliente = obtenerCuitCliente(clienteSeleccionado);

    // Construir objeto facturación con el formato exacto requerido
    const facturacion = {
      id: parseInt(Date.now().toString()), // Convertir a número entero
      periodo: document.getElementById('inputPeriodo').value,
      cliente: clienteSeleccionado,
      cuit: cuitCliente,
      servicio: document.getElementById('inputServicio').value.trim(),
      facturante: document.getElementById('inputFacturante').value.trim(),
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
        total: formatCurrency(document.getElementById('inputTotal').dataset.valorExacto)
      },
      factura: {
        tipo: document.getElementById('inputTipoFactura').value,
        numero: document.getElementById('inputNroFactura').value.trim() || null
      },
      fechaRegistro: new Date().toISOString(),
      estado: 'pendiente'
    };

    // Validar antes de guardar
    if (!validarFacturacion(facturacion)) {
      showNotification('❌ Por favor complete todos los campos requeridos', 'error');
      return;
    }

    // Mostrar el objeto que se va a guardar (para depuración)
    console.log('Objeto a guardar:', JSON.stringify(facturacion, null, 2));

    function obtenerCuitCliente(nombreCliente) {
      const clientes = JSON.parse(localStorage.getItem('clientes')) || []; // O donde guardes los clientes

      const clienteEncontrado = clientes.find(c => c.nombre === nombreCliente);
      return clienteEncontrado ? clienteEncontrado.cuit : "N/A";
    }


    // Enviar al proceso principal
    const resultado = await ipcRenderer.invoke('guardar-facturacion', facturacion);

    if (resultado.success) {
      showNotification('✅ Facturación guardada correctamente');

      // Resetear formulario
      const form = document.getElementById('facturacionForm');
      if (form) {
        form.reset();
        form.style.display = 'none';

        // Resetear valores calculados
        ['inputNeto', 'inputIVA', 'inputTotal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.value = '';
            el.dataset.valorExacto = '0';
          }
        });
      }

      // Mostrar botón de nueva facturación
      const nuevaFactBtn = document.getElementById('nuevaFacturacionBtn');
      if (nuevaFactBtn) nuevaFactBtn.style.display = 'block';

      // Recargar datos
      await loadFacturacionData();
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
    const facturaciones = await ipcRenderer.invoke('get-facturacion', month);
    const tbody = document.getElementById('facturacionTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!facturaciones || facturaciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="16" class="no-data">No hay facturaciones registradas</td></tr>`;
      return;
    }

    facturaciones.forEach(fact => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="compact">${formatMonth(fact.periodo)}</td>
        <td class="compact">${fact.cliente}</td>
        <td class="compact">${fact.servicio}</td>
        <td class="compact">${fact.facturante}</td>
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

    setupAutocomplete('inputCliente', 'clientesList', clientes);
    setupAutocomplete('inputServicio', 'serviciosList', servicios);
    setupAutocomplete('inputFacturante', 'facturantesList', facturantes);
  } catch (error) {
    console.error('Error cargando autocompletado:', error);
  }
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



