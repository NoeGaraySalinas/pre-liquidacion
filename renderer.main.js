const { ipcRenderer } = require('electron');
const path = require("path");
const fs = require("fs");

// Hacer ipcRenderer disponible globalmente para otros scripts
window.ipcRenderer = ipcRenderer;

console.log("renderer.main.js cargado correctamente");

// Función para cargar módulos externos
function loadExternalModule(moduleName, callback) {
  const script = document.createElement('script');
  script.src = `${moduleName}.js`;
  script.onload = () => {
    console.log(`${moduleName} cargado correctamente`);
    if (typeof callback === 'function') callback();
  };
  script.onerror = () => console.error(`Error al cargar ${moduleName}`);
  document.body.appendChild(script);
}

// Inicialización de todos los módulos
document.addEventListener("DOMContentLoaded", () => {
  initializeGestionClientesBtn();
  initializeGestionServiciosBtn();
  initializeFacturantesBtn();
  initializeGestionFacturacionBtn();
  initializeReporteGeneralBtn();
  setupFacturacionListeners();
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
    loadExternalModule('renderer-clientes', () => {
      if (typeof loadClientesTable === 'function') {
        loadClientesTable();
      }
    });
  });
}

// Inicializar el botón "Gestionar Servicios"
function initializeGestionServiciosBtn() {
  const btn = document.getElementById("gestionarServiciosBtn");
  if (!btn) {
    console.error("Botón 'Gestionar Servicios' no encontrado");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Botón 'Gestionar Servicios' presionado.");
    loadExternalModule('renderer-servicios', () => {
      if (typeof loadServiciosTable === 'function') {
        loadServiciosTable();
      }
    });
  });
}

// Inicializar el botón "Facturantes"
function initializeFacturantesBtn() {
  const btn = document.getElementById("gestionarFacturantesBtn");
  if (!btn) {
    console.error("Botón 'Gestionar Facturantes' no encontrado");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Botón 'Facturantes' presionado.");
    loadExternalModule('renderer-facturantes', () => {
      if (typeof loadFacturantesTable === 'function') {
        loadFacturantesTable();
      }
    });
  });
}

// Inicializar el botón "Gestionar Facturación"
function initializeGestionFacturacionBtn() {
  const btn = document.getElementById("gestionarFacturacion");
  if (!btn) {
    console.error("Error: No se encontró el botón 'Gestionar Facturación'");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Botón 'Gestionar Facturación' presionado");
    loadExternalModule('renderer-facturacion', () => {
      if (typeof loadFacturacionForm === 'function') {
        loadFacturacionForm();
      }
    });
  });
}

// Inicializar el botón "Reporte General"
function initializeReporteGeneralBtn() {
  const btn = document.getElementById("reporteGeneral");
  if (!btn) {
    console.error("Botón 'Reporte General' no encontrado");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Botón 'Reporte General' presionado");
    loadExternalModule('renderer-reportes', () => {
      if (typeof loadReporteGeneral === 'function') {
        loadReporteGeneral();
      }
    });
  });
}

// Configuración de listeners para facturación
function setupFacturacionListeners() {
  ipcRenderer.removeAllListeners(['factura-guardada', 'error-factura']);
  
  ipcRenderer.on('factura-guardada', () => {
    console.log("Factura guardada exitosamente");
    alert("Factura guardada correctamente");
  });

  ipcRenderer.on('error-factura', (event, error) => {
    console.error("Error en facturación:", error);
    alert(`Error: ${error}`);
  });
}

// Función para limpiar el área de contenido
function clearContentArea() {
  const contentDiv = document.getElementById("div3");
  if (contentDiv) {
    contentDiv.innerHTML = "";
  }
}