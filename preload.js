// window.ipcRenderer = require("electron").ipcRenderer;
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: { ...ipcRenderer, on: ipcRenderer.on },
});
