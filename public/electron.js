const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { spawn } = require("child_process");
const path = require("path");
const isDev = require("electron-is-dev");
const dialog = require("electron").dialog;
let mainWindow;
const server = require("./server");
const ipc = require("electron").ipcMain;
console.log(ipc);

// ipc.on("open-file-dialog-for-file", function (event) {
//   if (1) {
//     dialog.showOpenDialog(
//       {
//         properties: ["openFile"],
//       },
//       function (files) {
//         if (files) event.sender.send("selected-file", files[0]);
//       }
//     );
//   } else {
//     dialog.showOpenDialog(
//       {
//         properties: ["openFile", "openDirectory"],
//       },
//       function (files) {
//         if (files) event.sender.send("selected-file", files[0]);
//       }
//     );
//   }
// });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      // preload: path.join(app.getAppPath(), "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
    },
    icon: "",
  });

  mainWindow.loadURL("http://localhost:3001"); // Assuming your server runs on port 3000
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );
}

app.on("ready", createWindow);

// app.on("ready", () => {
//   server = spawn("node", ["server.js"], {
//     detached: true,
//     stdio: "ignore",
//   });
// });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
require("./server");
