const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectFile: () => ipcRenderer.invoke("dialog:openFile"),
  selectFolder: () => ipcRenderer.invoke("dialog:openDirectory"),
  generatePDFs: (data) => ipcRenderer.invoke("generate-pdfs", data),
  getFilePath: (file) => webUtils.getPathForFile(file),
});
