// Rutas de archivos
const rutaInsumos = path.join(__dirname, 'insumos.json');
let facturaInsumoEnEdicion = null;

// ============================================
// VERIFICAR ENTORNO
// ============================================
console.log(`📄 ${document.currentScript?.src?.split('/').pop() || 'renderer'} - Entorno:`, 
  window.APP_ENV?.isDevelopment ? 'Desarrollo 🛠️' : 
  (window.APP_ENV?.ready ? 'Producción 🚀' : 'No inicializado'));

// Función para cargar insumos desde archivo
function cargarInsumos() {
    if (!fs.existsSync(rutaInsumos)) {
        console.warn('Archivo insumos.json no encontrado. Creando uno nuevo...');
        try {
            fs.writeFileSync(rutaInsumos, '[]');
            insumos = [];
            console.log('Archivo insumos.json creado exitosamente');
        } catch (error) {
            console.error('Error al crear insumos.json:', error);
        }
        return;
    }

    try {
        const data = fs.readFileSync(rutaInsumos, 'utf8');
        insumos = JSON.parse(data);
        console.log(`${insumos.length} insumos cargados correctamente`);
    } catch (error) {
        console.error('Error al leer/parsear insumos.json:', error);
        insumos = [];
    }
}

// Función para guardar insumos en archivo
function guardarInsumos() {
    try {
        fs.writeFileSync(rutaInsumos, JSON.stringify(insumos, null, 2));
        console.log('Insumos guardados correctamente');
    } catch (error) {
        console.error('Error al guardar insumos:', error);
    }
}

// Función para formatear moneda
function formatPesos(valor) {
    return valor.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS'
    });
}

// Función principal para cargar el formulario de insumos
async function loadInsumosForm() {
    console.log('Cargando formulario de insumos...');

    const div3 = document.getElementById('div3');
    if (!div3) {
        console.error('Error: No se encontró el contenedor div3');
        return;
    }

    // Limpiamos el contenido anterior
    div3.innerHTML = '';

    // Creamos la estructura del formulario
    const formularioInsumos = document.createElement('div');
    formularioInsumos.id = 'formularioInsumos';
    formularioInsumos.innerHTML = `
        <h2 id="tituloInsumos">Registro de Facturas de Insumos</h2>
        <br>

        <div class="filtros-insumos">
            <input type="month" id="filterMonthInsumos" class="input-filtro">
            <input type="text" id="filterClienteInsumos" placeholder="Filtrar por cliente" class="input-filtro">
            <button id="btnFiltrarInsumos" class="btn-filtrar">Filtrar</button>
            <button id="btnLimpiarFiltrosInsumos" class="btn-secundario">Limpiar</button>
        </div>

        <br><br>

        <button id="btnNuevaFacturaInsumo" class="btn-primario">+ Nueva Factura</button>
        
        <form id="facturaInsumoForm" class="formulario-delimitado oculto" style="display:none;">
            
            <div class="seccion-formulario">
                <h3>Datos de la Factura</h3>

                <div class="fila-formulario">
                    <div class="grupo-formulario">
                        <label for="fechaFacturaInsumo">Fecha*</label>
                        <input type="date" id="fechaFacturaInsumo" required class="input-form">
                    </div>

                    <div class="grupo-formulario">
                        <label for="clienteFacturaInsumo">Cliente*</label>
                        <input type="text" id="clienteFacturaInsumo" list="listaClientes" required class="input-form">
                        <datalist id="listaClientes"></datalist>
                    </div>

                    <div class="grupo-formulario">
                        <label for="facturanteFacturaInsumo">Facturante*</label>
                        <select id="facturanteFacturaInsumo" required class="input-form">
                            <option value="">Seleccionar</option>
                        </select>
                    </div>

                    <div class="grupo-formulario">
                        <label for="tipoFacturaInsumo">Tipo de Factura*</label>
                        <select id="tipoFacturaInsumo" required class="input-form">
                            <option value="">Seleccionar</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="Fce-A">Fce-A</option>
                            <option value="Fce-B">Fce-B</option>
                            <option value="Sin factura">Sin factura</option>
                        </select>
                    </div>

                    <div class="grupo-formulario">
                        <label for="numeroFacturaInsumo">N° Factura*</label>
                        <input type="text" id="numeroFacturaInsumo" required class="input-form">
                    </div>
                </div>
            </div>
            
            <div class="seccion-formulario">
                <h3>Detalle de Insumos</h3>

                <div id="detalleInsumos">
                    <div class="item-insumo">
                        <input type="text" class="nombreInsumo input-form" placeholder="Nombre del insumo" required>
                        <input type="number" class="cantidadInsumo input-form" min="1" value="1" required>
                        <input type="text" class="precioInsumo input-form" placeholder="Precio unitario" required>
                        <button type="button" class="btn-eliminar-item">×</button>
                    </div>
                </div>

                <button type="button" id="btnAgregarItemInsumo" class="btn-secundario">+ Agregar Item</button>
            </div>
            
            <div class="seccion-formulario">
                <h3>Totales</h3>

                <div class="fila-formulario">
                    <div class="grupo-formulario">
                        <label for="subtotalFacturaInsumo">Subtotal</label>
                        <input type="text" id="subtotalFacturaInsumo" readonly class="input-form">
                    </div>

                    <div class="grupo-formulario">
                        <label for="ivaFacturaInsumo">IVA (21%)</label>
                        <input type="text" id="ivaFacturaInsumo" readonly class="input-form">
                    </div>

                    <div class="grupo-formulario">
                        <label for="totalFacturaInsumo">Total</label>
                        <input type="text" id="totalFacturaInsumo" readonly class="input-form">
                    </div>
                </div>
                
                <div class="acciones-formulario">
                    <button type="submit" class="btn-primario">Guardar Factura</button>
                    <button type="button" id="btnCancelarFacturaInsumo" class="btn-secundario">Cancelar</button>
                </div>
            </div>
        </form>
        
        <div class="tabla-contenedor">
            <table id="tablaInsumos" class="tabla-estilizada">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Facturante</th>
                        <th>Tipo</th>
                        <th>N° Factura</th>
                        <th>Cliente</th>
                        <th>Cantidad Items</th>
                        <th>Total</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="cuerpoTablaInsumos"></tbody>
            </table>
        </div>
    `;

    // Render en pantalla
    div3.appendChild(formularioInsumos);

    // Cargas iniciales
    cargarClientesEnDatalist();
    cargarFacturantesEnSelect(); // 👈 NUEVO (desde facturantes.json)

    setTimeout(() => {
        configurarEventosInsumos();
        renderizarFacturasInsumos();

        const tipoFacturaSelect = document.getElementById('tipoFacturaInsumo');
        if (tipoFacturaSelect) {
            tipoFacturaSelect.addEventListener('change', calcularTotalesFacturaInsumo);
        }
    }, 50);
}

async function cargarFacturantesEnSelect() {
    const select = document.getElementById("facturanteFacturaInsumo");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar</option>';

    let facturantes;

    try {
        facturantes = await ipcRenderer.invoke("get-facturantes");
    } catch (error) {
        console.error("Error obteniendo facturantes:", error);
        return;
    }

    if (!Array.isArray(facturantes)) {
        console.error("Facturantes no es un array:", facturantes);
        return;
    }

    facturantes.forEach(f => {
        const option = document.createElement("option");
        option.value = f.nombre;
        option.textContent = f.nombre;
        select.appendChild(option);
    });
}



function configurarEventosInsumos() {
    // Mostrar/ocultar formulario
    const btnNuevaFactura = document.getElementById('btnNuevaFacturaInsumo');
    if (btnNuevaFactura) {
        btnNuevaFactura.addEventListener('click', () => {
            const form = document.getElementById('facturaInsumoForm');
            if (form) {
                facturaInsumoEnEdicion = null; // 🔑 CLAVE: salir del modo edición
                form.reset();
                form.style.display = 'block';
                document.getElementById('fechaFacturaInsumo').valueAsDate = new Date();
            }
        });
    }

    // Agregar ítem al detalle
    const btnAgregarItem = document.getElementById('btnAgregarItemInsumo');
    if (btnAgregarItem) {
        btnAgregarItem.addEventListener('click', agregarItemInsumo);
    }

    // Calcular totales cuando cambian los valores
    const detalleInsumos = document.getElementById('detalleInsumos');
    if (detalleInsumos) {
        detalleInsumos.addEventListener('input', calcularTotalesFacturaInsumo);
    }

    // Enviar formulario
    const form = document.getElementById('facturaInsumoForm');
    if (form) {
        form.addEventListener('submit', guardarFacturaInsumo);
    }

    // Cancelar factura
    const btnCancelar = document.getElementById('btnCancelarFacturaInsumo');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            const form = document.getElementById('facturaInsumoForm');
            if (form) {
                facturaInsumoEnEdicion = null; // 🔑 también al cancelar
                form.style.display = 'none';
            }
        });
    }

    // Filtros
    const btnFiltrar = document.getElementById('btnFiltrarInsumos');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', aplicarFiltrosInsumos);
    }

    const btnLimpiar = document.getElementById('btnLimpiarFiltrosInsumos');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltrosInsumos);
    }
}


function agregarItemInsumo() {
    const detalle = document.getElementById('detalleInsumos');
    if (!detalle) return;

    const nuevoItem = document.createElement('div');
    nuevoItem.className = 'item-insumo';
    nuevoItem.innerHTML = `
        <input type="text" class="nombreInsumo input-form" placeholder="Nombre del insumo" required>
        <input type="number" class="cantidadInsumo input-form" min="1" value="1" required>
        <input type="text" class="precioInsumo input-form" placeholder="Precio unitario" required>
        <button type="button" class="btn-eliminar-item">×</button>
    `;
    detalle.appendChild(nuevoItem);

    // Agregar evento al botón de eliminar
    const btnEliminar = nuevoItem.querySelector('.btn-eliminar-item');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', function () {
            detalle.removeChild(nuevoItem);
            calcularTotalesFacturaInsumo();
        });
    }
}

function cargarClientesEnDatalist() {
    const rutaClientes = path.join(__dirname, 'clientes.json');
    const datalist = document.getElementById('listaClientes');

    if (!datalist) return;

    try {
        const datos = fs.readFileSync(rutaClientes, 'utf-8');
        const clientes = JSON.parse(datos);

        datalist.innerHTML = ''; // Limpiar opciones previas
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.nombre;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

function calcularTotalesFacturaInsumo() {
    const items = document.querySelectorAll('.item-insumo');
    const tipoFactura = document.getElementById('tipoFacturaInsumo')?.value || '';
    let subtotal = 0;

    items.forEach(item => {
        const cantidad = parseFloat(item.querySelector('.cantidadInsumo').value) || 0;
        const precio = parseFloat(item.querySelector('.precioInsumo').value.replace(',', '.')) || 0;
        subtotal += cantidad * precio;
    });

    const aplicaIVA = !(tipoFactura === 'C' || tipoFactura === 'Sin factura');
    const iva = aplicaIVA ? subtotal * 0.21 : 0;
    const total = subtotal + iva;

    // Mostrar como texto formateado, guardar el valor real en atributo
    const subtotalInput = document.getElementById('subtotalFacturaInsumo');
    subtotalInput.value = formatPesos(subtotal);
    subtotalInput.setAttribute('data-valor', subtotal.toFixed(2));

    const ivaInput = document.getElementById('ivaFacturaInsumo');
    ivaInput.value = formatPesos(iva);
    ivaInput.setAttribute('data-valor', iva.toFixed(2));

    const totalInput = document.getElementById('totalFacturaInsumo');
    totalInput.value = formatPesos(total);
    totalInput.setAttribute('data-valor', total.toFixed(2));
}

function guardarFacturaInsumo(e) {
    e.preventDefault();

    const fecha = document.getElementById('fechaFacturaInsumo').value;
    const cliente = document.getElementById('clienteFacturaInsumo').value;
    const numero = document.getElementById('numeroFacturaInsumo').value;
    const tipo = document.getElementById('tipoFacturaInsumo').value;
    const facturante = document.getElementById('facturanteFacturaInsumo').value;

    if (!fecha || !cliente || !numero || !tipo || !facturante) {
        alert('Complete todos los campos obligatorios');
        return;
    }

    const items = [];
    document.querySelectorAll('.item-insumo').forEach(item => {
        items.push({
            nombre: item.querySelector('.nombreInsumo').value,
            cantidad: parseFloat(item.querySelector('.cantidadInsumo').value),
            precio: parseFloat(item.querySelector('.precioInsumo').value.replace(',', '.'))
        });
    });

    if (items.length === 0) {
        alert('Agregue al menos un ítem a la factura');
        return;
    }

    const subtotal = parseFloat(document.getElementById('subtotalFacturaInsumo').dataset.valor) || 0;
    const iva = parseFloat(document.getElementById('ivaFacturaInsumo').dataset.valor) || 0;
    const total = parseFloat(document.getElementById('totalFacturaInsumo').dataset.valor) || 0;

    if (facturaInsumoEnEdicion) {
        const index = insumos.findIndex(f => f.id === facturaInsumoEnEdicion);
        if (index === -1) return;

        insumos[index] = {
            ...insumos[index],
            fecha,
            numero,
            cliente,
            facturante,
            tipo,
            items,
            subtotal,
            iva,
            total
        };

        facturaInsumoEnEdicion = null;
    } else {
        insumos.push({
            id: Date.now().toString(),
            fecha,
            numero,
            cliente,
            facturante,
            tipo,
            items,
            subtotal,
            iva,
            total
        });
    }

    guardarInsumos();
    document.getElementById('facturaInsumoForm').style.display = 'none';
    renderizarFacturasInsumos();
}


function editarFacturaInsumo(id) {
    const factura = insumos.find(f => f.id === id);
    if (!factura) {
        console.warn("No se encontró la factura a editar:", id);
        return;
    }

    facturaInsumoEnEdicion = id;

    const form = document.getElementById('facturaInsumoForm');
    form.style.display = 'block';

    document.getElementById('tituloInsumos').textContent = 'Editar Factura de Insumos';
    document.getElementById('fechaFacturaInsumo').value = factura.fecha;
    document.getElementById('clienteFacturaInsumo').value = factura.cliente;
    document.getElementById('facturanteFacturaInsumo').value = factura.facturante || '';
    document.getElementById('tipoFacturaInsumo').value = factura.tipo;
    document.getElementById('numeroFacturaInsumo').value = factura.numero;

    const detalle = document.getElementById('detalleInsumos');
    detalle.innerHTML = '';

    factura.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-insumo';

        div.innerHTML = `
      <input type="text" class="nombreInsumo input-form" value="${item.nombre}" required>
      <input type="number" class="cantidadInsumo input-form" value="${item.cantidad}" min="1" required>
      <input type="text" class="precioInsumo input-form" value="${item.precio}" required>
      <button type="button" class="btn-eliminar-item">×</button>
    `;

        div.querySelector('.btn-eliminar-item').addEventListener('click', () => {
            detalle.removeChild(div);
            calcularTotalesFacturaInsumo();
        });

        detalle.appendChild(div);
    });

    calcularTotalesFacturaInsumo();
}

function renderizarFacturasInsumos(facturasFiltradas = null) {
    const cuerpoTabla = document.getElementById('cuerpoTablaInsumos');
    if (!cuerpoTabla) return;

    cuerpoTabla.innerHTML = '';

    const datos = facturasFiltradas || insumos;

    if (datos.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="7">No hay facturas de insumos registradas</td></tr>';
        return;
    }

    datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(factura => {
        const fila = document.createElement('tr');

        fila.innerHTML = `
          <td>${new Date(factura.fecha).toLocaleDateString()}</td>
          <td>${factura.facturante || '—'}</td>
          <td>${factura.tipo}</td>
          <td>${factura.numero}</td>
          <td>${factura.cliente}</td>
          <td>${factura.items.length}</td>
          <td>${formatPesos(factura.total)}</td>
            <td>
              <button class="btn-accion" onclick="verDetalleFacturaInsumo('${factura.id}')">👁️</button>
              <button class="btn-accion" onclick="editarFacturaInsumo('${factura.id}')">✏️</button>
              <button class="btn-accion btn-peligro" onclick="eliminarFacturaInsumo('${factura.id}')">🗑️</button>
            </td>
        `;

        cuerpoTabla.appendChild(fila);
    });
}

function aplicarFiltrosInsumos() {
    const mes = document.getElementById('filterMonthInsumos').value;
    const cliente = document.getElementById('filterClienteInsumos').value.toLowerCase();

    let filtradas = insumos;

    if (mes) {
        filtradas = filtradas.filter(f => f.fecha.startsWith(mes));
    }

    if (cliente) {
        filtradas = filtradas.filter(f => f.cliente.toLowerCase().includes(cliente));
    }

    renderizarFacturasInsumos(filtradas);
}

function limpiarFiltrosInsumos() {
    document.getElementById('filterMonthInsumos').value = '';
    document.getElementById('filterClienteInsumos').value = '';
    renderizarFacturasInsumos();
}

function verDetalleFacturaInsumo(id) {
    const factura = insumos.find(f => f.id === id);
    if (!factura) return;

    let detalle = `Factura N° ${factura.numero}\n`;
    detalle += `Cliente: ${factura.cliente}\n`;
    detalle += `Fecha: ${new Date(factura.fecha).toLocaleDateString()}\n\n`;
    detalle += 'Detalle de Insumos:\n';

    factura.items.forEach(item => {
        detalle += `- ${item.nombre}: ${item.cantidad} × ${formatPesos(item.precio)} = ${formatPesos(item.cantidad * item.precio)}\n`;
    });

    detalle += `\nSubtotal: ${formatPesos(factura.subtotal)}\n`;
    detalle += `IVA (21%): ${formatPesos(factura.iva)}\n`;
    detalle += `TOTAL: ${formatPesos(factura.total)}`;

    alert(detalle);
}

function eliminarFacturaInsumo(id) {
    if (!confirm('¿Está seguro que desea eliminar esta factura de insumos?')) return;

    insumos = insumos.filter(f => f.id !== id);
    guardarInsumos();
    renderizarFacturasInsumos();
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado - Módulo de Insumos');
    cargarInsumos();

    // Configurar el botón de insumos
    const insumosBtn = document.getElementById('insumosBtn');
    if (insumosBtn) {
        insumosBtn.addEventListener('click', loadInsumosForm);
    }
});

// Hacer funciones accesibles globalmente
window.verDetalleFacturaInsumo = verDetalleFacturaInsumo;
window.eliminarFacturaInsumo = eliminarFacturaInsumo;
