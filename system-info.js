// system-info.js - INCLUYE ESTE ARCHIVO EN TODOS TUS HTML

/**
 * Utilidad para obtener información del sistema Electron
 * Compatible con múltiples renderers sin preload.js
 */

class ElectronSystemInfo {
  constructor() {
    this.info = null;
    this.ipcRenderer = null;
    this.initialized = false;
  }

  // Inicializar y obtener el ipcRenderer
  async init() {
    if (this.initialized) return this.info;
    
    try {
      // Verificar que estamos en Electron
      if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
        // Obtener ipcRenderer de Electron
        const { ipcRenderer } = require('electron');
        this.ipcRenderer = ipcRenderer;
        
        // Obtener información del sistema
        this.info = await ipcRenderer.invoke('get-app-info');
        this.info.dataDirectory = await ipcRenderer.invoke('get-data-directory');
        
        this.initialized = true;
        console.log('✅ ElectronSystemInfo inicializado');
        
        // Mostrar banner si estamos en desarrollo
        if (this.info.isDevelopment) {
          this.showDevBanner();
        }
        
        return this.info;
      } else {
        console.warn('⚠️ No estamos en entorno Electron');
        return this.getFallbackInfo();
      }
    } catch (error) {
      console.error('❌ Error inicializando ElectronSystemInfo:', error);
      return this.getFallbackInfo();
    }
  }

  // Información de respaldo si no estamos en Electron
  getFallbackInfo() {
    return {
      isDevelopment: true,
      isPackaged: false,
      dataDirectory: 'carpeta-del-proyecto',
      userDataPath: 'carpeta-del-proyecto',
      resourcesPath: 'carpeta-del-proyecto'
    };
  }

  // Mostrar banner de desarrollo
  showDevBanner() {
    // Evitar múltiples banners
    if (document.getElementById('electron-dev-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'electron-dev-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
      color: white;
      padding: 8px 15px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid rgba(255,255,255,0.3);
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 3px; font-weight: bold;">
          🛠️ DESARROLLO
        </span>
        <span>📁 Datos: ${this.info.dataDirectory}</span>
      </div>
      <button id="close-dev-banner" style="
        background: rgba(255,255,255,0.2); 
        border: none; 
        color: white; 
        cursor: pointer; 
        font-size: 18px; 
        width: 30px; 
        height: 30px; 
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s;
      ">×</button>
    `;
    
    document.body.prepend(banner);
    
    // Ajustar el margin-top del contenido
    const bannerHeight = banner.offsetHeight;
    document.body.style.paddingTop = `${bannerHeight}px`;
    
    // Botón para cerrar
    document.getElementById('close-dev-banner').addEventListener('click', () => {
      banner.style.transform = 'translateY(-100%)';
      banner.style.transition = 'transform 0.3s ease';
      setTimeout(() => banner.remove(), 300);
      document.body.style.paddingTop = '0';
    });
    
    // Auto-ocultar después de 10 segundos (opcional)
    setTimeout(() => {
      if (document.getElementById('close-dev-banner')) {
        document.getElementById('close-dev-banner').click();
      }
    }, 10000);
  }

  // Métodos de utilidad
  isDevelopment() {
    return this.info ? this.info.isDevelopment : false;
  }

  getDataPath() {
    return this.info ? this.info.dataDirectory : '';
  }

  // Método para abrir la carpeta de datos (solo en producción)
  async openDataFolder() {
    if (!this.ipcRenderer) return;
    
    try {
      const { shell } = require('electron');
      const path = require('path');
      const dataDir = this.info.dataDirectory;
      
      // Verificar si la carpeta existe
      const fs = require('fs');
      if (fs.existsSync(dataDir)) {
        shell.openPath(dataDir);
        return true;
      } else {
        // Crear la carpeta si no existe
        fs.mkdirSync(dataDir, { recursive: true });
        shell.openPath(dataDir);
        return true;
      }
    } catch (error) {
      console.error('Error abriendo carpeta:', error);
      return false;
    }
  }

  // Mostrar diálogo con información
  showInfoDialog() {
    if (!this.info) return;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 5px 30px rgba(0,0,0,0.3);
      z-index: 10001;
      min-width: 300px;
      max-width: 500px;
      font-family: Arial, sans-serif;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">Información del Sistema</h3>
      <div style="margin: 15px 0;">
        <strong>Entorno:</strong> ${this.info.isDevelopment ? '🛠️ Desarrollo' : '🚀 Producción'}<br>
        <strong>Carpeta de datos:</strong> ${this.info.dataDirectory}<br>
        <strong>App empaquetada:</strong> ${this.info.isPackaged ? 'Sí' : 'No'}<br>
        <strong>User Data:</strong> ${this.info.userDataPath}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button id="open-folder-btn" style="
          padding: 8px 15px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Abrir Carpeta</button>
        <button id="close-dialog-btn" style="
          padding: 8px 15px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Cerrar</button>
      </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Event listeners
    document.getElementById('close-dialog-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      document.body.removeChild(dialog);
    });
    
    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay);
      document.body.removeChild(dialog);
    });
    
    document.getElementById('open-folder-btn').addEventListener('click', () => {
      this.openDataFolder();
    });
  }
}

// Crear instancia global
window.electronSystem = new ElectronSystemInfo();

// Auto-inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const info = await window.electronSystem.init();
    
    // Guardar en localStorage para acceso rápido
    if (info) {
      localStorage.setItem('electronAppInfo', JSON.stringify(info));
    }
    
    // También exponer información globalmente
    window.appEnvironment = {
      isDevelopment: info?.isDevelopment || false,
      dataDirectory: info?.dataDirectory || '',
      isPackaged: info?.isPackaged || false
    };
    
    console.log('🎯 App Environment:', window.appEnvironment);
    
  } catch (error) {
    console.log('ℹ️ Info: No se pudo inicializar sistema Electron (posiblemente no estamos en Electron)');
  }
});