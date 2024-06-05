// const { contextBridge, ipcRenderer } = require("electron");

// contextBridge.exposeInMainWorld("ipcRenderer", ipcRenderer);

const { contextBridge, ipcRenderer } = require("electron");

const allowedIpcRendererMethods = ["on", "send"]; // Adjust based on your needs

contextBridge.exposeInMainWorld("ipcRenderer", {
  on: ipcRenderer.on.bind(ipcRenderer),
  send: ipcRenderer.send.bind(ipcRenderer),
});
