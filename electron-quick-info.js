// electron-quick-info.js
// Archivo compartido para información del entorno Electron

console.log('🔍 Inicializando información del entorno Electron...');

// Variable global para la información
window.APP_ENV = {
  ready: false,
  isDevelopment: false,
  dataDirectory: '',
  isPackaged: false
};

// Función para inicializar el entorno
window.initElectronEnv = async function() {
  if (window.APP_ENV.ready) {
    console.log('✅ Entorno ya inicializado');
    return window.APP_ENV;
  }
  
  try {
    console.log('🔄 Obteniendo información del sistema...');
    
    // Requerir módulos de Electron
    const { ipcRenderer } = require('electron');
    
    // Obtener información del main process
    const info = await ipcRenderer.invoke('get-app-info');
    const dataDir = await ipcRenderer.invoke('get-data-directory');
    
    // Guardar en variable global
    window.APP_ENV = {
      ready: true,
      isDevelopment: info.isDevelopment,
      isPackaged: info.isPackaged,
      dataDirectory: dataDir,
      userDataPath: info.userDataPath,
      resourcesPath: info.resourcesPath
    };
    
    console.log('🎯 Entorno detectado:', window.APP_ENV.isDevelopment ? 'DESARROLLO 🛠️' : 'PRODUCCIÓN 🚀');
    console.log('📁 Carpeta de datos:', window.APP_ENV.dataDirectory);
    
    // Mostrar mensaje útil según el entorno
    if (window.APP_ENV.isDevelopment) {
      console.log('💡 En desarrollo: Los archivos JSON están en tu carpeta del proyecto');
    } else {
      console.log('💡 En producción: Los archivos JSON están en la carpeta de datos del usuario');
      console.log('💡 El usuario puede acceder a:', window.APP_ENV.dataDirectory);
    }
    
    return window.APP_ENV;
    
  } catch (error) {
    console.error('❌ Error obteniendo información del entorno:', error);
    
    // Fallback para cuando no estamos en Electron
    window.APP_ENV = {
      ready: true,
      isDevelopment: true,
      isPackaged: false,
      dataDirectory: 'carpeta-del-proyecto',
      userDataPath: 'carpeta-del-proyecto'
    };
    
    console.log('ℹ️ Usando configuración de fallback (probablemente desarrollo)');
    return window.APP_ENV;
  }
};

// Función para mostrar información en la UI (opcional)
window.showEnvInfo = function() {
  const info = window.APP_ENV;
  if (!info.ready) return;
  
  const envDiv = document.createElement('div');
  envDiv.id = 'env-info-banner';
  envDiv.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: ${info.isDevelopment ? 'rgba(255, 107, 107, 0.9)' : 'rgba(76, 175, 80, 0.9)'};
    color: white;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    cursor: pointer;
    font-family: Arial, sans-serif;
  `;
  
  envDiv.innerHTML = `
    <strong>${info.isDevelopment ? '🛠️ Desarrollo' : '🚀 Producción'}</strong><br>
    <small>Datos: ${info.dataDirectory.split(/[\\/]/).pop()}</small>
    <div style="font-size: 10px; margin-top: 3px; opacity: 0.8;">Click para más info</div>
  `;
  
  envDiv.title = `Carpeta completa: ${info.dataDirectory}`;
  
  // Al hacer click, mostrar diálogo con más información
  envDiv.addEventListener('click', () => {
    const message = `
      🎯 INFORMACIÓN DEL SISTEMA
      
      Entorno: ${info.isDevelopment ? 'Desarrollo' : 'Producción'}
      Empaquetado: ${info.isPackaged ? 'Sí' : 'No'}
      
      📁 CARPETAS:
      • Datos: ${info.dataDirectory}
      • User Data: ${info.userDataPath}
      ${info.resourcesPath ? `• Recursos: ${info.resourcesPath}` : ''}
      
      ℹ️ Los archivos JSON están en la carpeta de datos.
      ${info.isDevelopment ? 'En desarrollo, esta es tu carpeta del proyecto.' : 'En producción, el usuario puede acceder a esta carpeta.'}
    `;
    
    alert(message.replace(/^\s+/gm, ''));
  });
  
  document.body.appendChild(envDiv);
  
  // Auto-ocultar después de 10 segundos (solo en producción)
  if (!info.isDevelopment) {
    setTimeout(() => {
      if (document.getElementById('env-info-banner')) {
        document.getElementById('env-info-banner').style.opacity = '0.5';
      }
    }, 10000);
  }
  
  return envDiv;
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM cargado, inicializando entorno Electron...');
  
  // Inicializar entorno
  const env = await window.initElectronEnv();
  
  // Mostrar banner si es desarrollo
  if (env.isDevelopment) {
    window.showEnvInfo();
  }
  
  // También exponer una función global para que otros scripts la usen
  window.getAppEnvironment = () => window.APP_ENV;
});

// Exportar para módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initElectronEnv: window.initElectronEnv,
    APP_ENV: window.APP_ENV
  };
}

console.log('✅ electron-quick-info.js cargado');