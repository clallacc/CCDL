require("./rt/electron-rt");
//////////////////////////////
// User Defined Preload scripts below
console.log("User Preload!");

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onShowCsvToJson: (callback: () => void) => {
    const listener = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on("show-csv-to-json", listener);
    return () => {
      ipcRenderer.removeListener("show-csv-to-json", listener);
    };
  },
});
