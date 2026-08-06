const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectFile: () => ipcRenderer.invoke("dialog:openFile"),
  selectFolder: () => ipcRenderer.invoke("dialog:openDirectory"),
  generatePDFs: (data) => ipcRenderer.invoke("generate-pdfs", data),
});
