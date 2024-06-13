const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const { spawn, exec } = require("child_process");
const path = require("path");
const isDev = require("electron-is-dev");
const dialog = require("electron").dialog;
let mainWindow;
const server = require("./server");
const ipcMain = require("electron").ipcMain;
console.log(ipcMain);

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

ipcMain.on("run-adb-pair", (event, ipPort, password) => {
  const command = `adb pair ${ipPort}`;
  const adbProcess = exec(command);

  adbProcess.stdout.on("data", (data) => {
    if (data.includes("Enter pairing code")) {
      adbProcess.stdin.write(`${password}\n`);
    }
  });

  adbProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  adbProcess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    event.sender.send("adb-pair-result", code === 0 ? "Success" : "Failed");
  });
});

let recordingProcess;

ipcMain.on("start-screenrecord", (event, device) => {
  const startScreenRecord = () => {
    const startCommand = `adb -s ${device} shell screenrecord /sdcard/screenrecord.mp4`;
    recordingProcess = exec(startCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        event.reply("screenrecord-error");
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      event.reply("screenrecord-started");
    });

    // Handle process termination
    recordingProcess.on("exit", (code, signal) => {
      console.log(
        `Screen recording process on device ${device} terminated with code ${code} and signal ${signal}`
      );
      if (code === null) {
        console.log(
          `Screen recording process on device ${device} was killed by signal ${signal}`
        );
        event.reply(
          "screenrecord-error",
          `Screen recording process on device ${device} was killed by signal ${signal}`
        );
      }
    });
  };

  // Attempt to start recording with default resolution
  startScreenRecord();

  // If default resolution fails, try lower resolutions
  // recordingProcess.on("exit", (code, signal) => {
  //   if (code !== 0) {
  //     console.log(
  //       `Default resolution failed on device ${device}. Trying lower resolution.`
  //     );
  //     startScreenRecord("640x480"); // Lower resolution
  //   }
  // });
});

ipcMain.on("pull-video", (event, device) => {
  try {
    exec(`adb -s ${device} pull /sdcard/screenrecord.mp4 ./screenrecord.mp4`);

    console.log("Video pull successful");
    event.sender.send("video-pull-success", "./screenrecord.mp4");
  } catch (error) {
    console.error("Error pulling video:", error);
    event.sender.send("video-pull-error", error);
  }
});

ipcMain.on("stop-screenrecord", (event, device) => {
  if (recordingProcess) {
    exec(
      `adb -s ${device} shell pkill -SIGINT screenrecord`,
      (stopError, stopStdout, stopStderr) => {
        if (stopError) {
          console.error(`exec error: ${stopError}`);
          event.reply(
            "screenrecord-error",
            `Error stopping screen recording: ${stopError.message}`
          );
          return;
        }
        console.log(`stdout: ${stopStdout}`);
        console.log(`stderr: ${stopStderr}`);
      }
    );
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
    },
    icon: "",
  });
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);

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
