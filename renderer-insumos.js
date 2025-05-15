// Rutas de archivos
const rutaInsumos = path.join(__dirname, 'insumos.json');
const existingLink = document.querySelector('link[href="rentab-style.css"]');

// Variables globales
let insumos = [];

const rentabCssId = 'rentab-css';

if (!document.getElementById(rentabCssId)) {
    const link = document.createElement('link');
    link.id = rentabCssId;
    link.rel = 'stylesheet';
    link.href = 'rentab-style.css'; // Como está en la raíz, esto es correcto
    document.head.appendChild(link);
}

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

cargarEstilosRentab();

// Función principal para cargar el formulario de insumos
function loadInsumosForm() {
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
        <h2>Registro de Facturas de Insumos</h2>
        
        <div class="filtros-insumos">
            <input type="month" id="filterMonthInsumos" class="input-filtro">
            <input type="text" id="filterClienteInsumos" placeholder="Filtrar por cliente" class="input-filtro">
            <button id="btnFiltrarInsumos" class="btn-filtrar">Filtrar</button>
            <button id="btnLimpiarFiltrosInsumos" class="btn-secundario">Limpiar</button>
        </div>
        
        <button id="btnNuevaFacturaInsumo" class="btn-primario">+ Nueva Factura</button>
        
        <form id="facturaInsumoForm" class="oculto" style="display:none;">
            <div class="seccion-formulario">
                <h3>Datos de la Factura</h3>
                <div class="fila-formulario">
                    <div class="grupo-formulario">
                        <label for="fechaFacturaInsumo">Fecha*</label>
                        <input type="date" id="fechaFacturaInsumo" required class="input-form">
                    </div>
                    <div class="grupo-formulario">
                        <label for="clienteFacturaInsumo">Cliente*</label>
                        <input type="text" id="clienteFacturaInsumo" required class="input-form">
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

    // Agregamos el formulario al div3
    div3.appendChild(formularioInsumos);

    // Configuramos los eventos después de que el HTML se haya insertado
    setTimeout(() => {
        configurarEventosInsumos();
        renderizarFacturasInsumos();
    }, 50);
}

function configurarEventosInsumos() {
    // Mostrar/ocultar formulario
    const btnNuevaFactura = document.getElementById('btnNuevaFacturaInsumo');
    if (btnNuevaFactura) {
        btnNuevaFactura.addEventListener('click', () => {
            const form = document.getElementById('facturaInsumoForm');
            if (form) {
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
        btnEliminar.addEventListener('click', function() {
            detalle.removeChild(nuevoItem);
            calcularTotalesFacturaInsumo();
        });
    }
}

function calcularTotalesFacturaInsumo() {
    const items = document.querySelectorAll('.item-insumo');
    let subtotal = 0;
    
    items.forEach(item => {
        const cantidad = parseFloat(item.querySelector('.cantidadInsumo').value) || 0;
        const precio = parseFloat(item.querySelector('.precioInsumo').value.replace(',', '.')) || 0;
        subtotal += cantidad * precio;
    });
    
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    
    document.getElementById('subtotalFacturaInsumo').value = formatPesos(subtotal);
    document.getElementById('ivaFacturaInsumo').value = formatPesos(iva);
    document.getElementById('totalFacturaInsumo').value = formatPesos(total);
}

function guardarFacturaInsumo(e) {
    e.preventDefault();
    
    const fecha = document.getElementById('fechaFacturaInsumo').value;
    const cliente = document.getElementById('clienteFacturaInsumo').value;
    const numero = document.getElementById('numeroFacturaInsumo').value;
    
    if (!fecha || !cliente || !numero) {
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
    
    const subtotal = parseFloat(document.getElementById('subtotalFacturaInsumo').value.replace(/[^\d.-]/g, ''));
    const iva = parseFloat(document.getElementById('ivaFacturaInsumo').value.replace(/[^\d.-]/g, ''));
    const total = parseFloat(document.getElementById('totalFacturaInsumo').value.replace(/[^\d.-]/g, ''));

    const factura = {
        id: Date.now().toString(),
        fecha,
        numero,
        cliente,
        items,
        subtotal,
        iva,
        total
    };
    
    insumos.push(factura);
    guardarInsumos();
    
    document.getElementById('facturaInsumoForm').style.display = 'none';
    renderizarFacturasInsumos();
}

function renderizarFacturasInsumos(facturasFiltradas = null) {
    const cuerpoTabla = document.getElementById('cuerpoTablaInsumos');
    if (!cuerpoTabla) return;
    
    cuerpoTabla.innerHTML = '';
    
    const datos = facturasFiltradas || insumos;
    
    if (datos.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="6">No hay facturas de insumos registradas</td></tr>';
        return;
    }
    
    datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(factura => {
        const fila = document.createElement('tr');
        
        fila.innerHTML = `
            <td>${new Date(factura.fecha).toLocaleDateString()}</td>
            <td>${factura.numero}</td>
            <td>${factura.cliente}</td>
            <td>${factura.items.length}</td>
            <td>${formatPesos(factura.total)}</td>
            <td>
                <button class="btn-accion" onclick="verDetalleFacturaInsumo('${factura.id}')">👁️</button>
                <button class="btn-accion btn-peligro" onclick="eliminarFacturaInsumo('${factura.id}')">🗑️</button>
            </td>
        `;
        
        cuerpoTabla.appendChild(fila);
    });
}

function cargarEstilosRentab() {
  const head = document.head;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'rentab-style.css';
  link.type = 'text/css';
  link.id = 'rentab-style';

  // Evitar que se cargue más de una vez
  if (!document.getElementById('rentab-style')) {
    head.appendChild(link);
  }
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

document.getElementById('facturaInsumoForm').classList.remove('oculto');
document.getElementById('facturaInsumoForm').classList.add('visible');


// Hacer funciones accesibles globalmente
window.verDetalleFacturaInsumo = verDetalleFacturaInsumo;
window.eliminarFacturaInsumo = eliminarFacturaInsumo;