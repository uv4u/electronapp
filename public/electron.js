const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { spawn } = require("child_process");
const path = require("path");
const isDev = require("electron-is-dev");
const dialog = require("electron").dialog;
let mainWindow;
const server = require("./server");
const ipcMain = require("electron").ipcMain;
console.log(ipcMain);

// [1]        '-ipc-message': [Function (anonymous)],
// [1]       '-ipc-invoke': [Function (anonymous)],
// [1]       '-ipc-message-sync': [Function (anonymous)],
// [1]       '-ipc-ports': [Function (anonymous)],
// [1]       crashed: [Function (anonymous)],
// [1]       'render-process-gone': [Function (anonymous)],
// [1]       'devtools-reload-page': [Function (anonymous)],
// [1]       '-new-window': [Function (anonymous)],
// [1]       '-will-add-new-contents': [Function (anonymous)],
// [1]       '-add-new-contents': [Function (anonymous)],
// [1]       login: [Function (anonymous)],
// [1]       'ready-to-show': [Function (anonymous)],
// [1]       'select-bluetooth-device': [Function (anonymous)]
// [1]     },
// [1]     _eventsCount: 13

ipcMain.on("open-file-dialog-for-file", (event) => {
  // Handle potential errors gracefully
  try {
    const properties = ["openFile"];
    dialog
      .showOpenDialog({
        properties,
        filters: [
          { name: "Android File", extensions: ["apk"] },
          { name: "All Files", extensions: ["*"] },
        ],
      })
      .then((result) => {
        const [file] = result.filePaths; // Destructure for clarity
        if (file) {
          event.sender.send("selected-file", file);
        }
      })
      .catch((err) => {
        console.error("Error opening file dialog:", err);
        // Handle the error appropriately, e.g., display a message to the user
      });
  } catch (error) {
    console.error("Unexpected error:", error);
    // Handle unexpected errors appropriately
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
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
