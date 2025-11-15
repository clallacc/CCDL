import type { CapacitorElectronConfig } from "@capacitor-community/electron";
import {
  getCapacitorElectronConfig,
  setupElectronDeepLinking,
} from "@capacitor-community/electron";
import type { MenuItemConstructorOptions } from "electron";
import { app, Menu, ipcMain } from "electron";
import electronIsDev from "electron-is-dev";
import unhandled from "electron-unhandled";
import { autoUpdater } from "electron-updater";

import {
  ElectronCapacitorApp,
  setupContentSecurityPolicy,
  setupReloadWatcher,
} from "./setup";

// Graceful handling of unhandled errors.
unhandled();

// Define tray menu template (optional)
const trayMenuTemplate: MenuItemConstructorOptions[] = [
  { label: "Quit App", role: "quit" },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig =
  getCapacitorElectronConfig();

// Initialize our app with tray menu (no app menu here, we'll set it later)
const myCapacitorApp = new ElectronCapacitorApp(
  capacitorFileConfig,
  trayMenuTemplate
);

// Setup deep linking if enabled
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol:
      capacitorFileConfig.electron.deepLinkingCustomProtocol ??
      "mycapacitorapp",
  });
}

// Setup reload watcher in dev mode
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Main async function to initialize app and set menu
(async () => {
  await app.whenReady();

  // Setup Content Security Policy
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());

  // Initialize Capacitor Electron app (creates main window)
  await myCapacitorApp.init();

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  // Get main window instance
  const mainWindow = myCapacitorApp.getMainWindow();

  // Define menu template with proper typing and platform-specific roles
  const menuTemplate: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [{ role: "appMenu" as const }]
      : [{ role: "fileMenu" as const }]),
    { role: "viewMenu" as const },
    {
      label: "Edit",
      submenu: [
        {
          label: "Add List Item",
          click: () => {
            // Send an IPC event to the renderer process
            mainWindow.webContents.send("show-csv-to-json");
          },
        },
      ],
    },
  ];

  // Build and set application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
})();

// Handle when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle dock icon click on macOS
app.on("activate", async () => {
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line

// Example: Handle IPC events from the renderer process
ipcMain.on("example-event", (event, args) => {
  console.log("Received example-event with args:", args);
});
