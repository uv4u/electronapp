const express = require("express");
const bodyParser = require("body-parser");
const adb = require("adbkit");
const logcat = require("adbkit-logcat");
const { spawn } = require("child_process");
const client = adb.createClient();
var cors = require("cors");
const fs = require("fs");

const app = express();

///////////////////////////////////
const socketIo = require("socket.io");
const server = require("http").createServer(app);
const io = socketIo(server);
////////////////////////////////////

// console.log("hello");

app.use(bodyParser.json());
const corsOpts = {
  origin: "*",

  methods: ["GET", "POST"],

  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOpts));

const getDeviceID = async () => {
  try {
    const devices = await client.listDevices();
    if (devices.length > 0) {
      // console.log(devices);
      return devices;
      // return devices[0].id;
    }
    return null;
  } catch (error) {
    console.error("Something went wrong:", error.stack);
    return null;
  }
};

const clients = [];

//FETCHING DEVICE ID PART

//ESTABLISH CONNECTION USING IP AND PORT

const connectToDevice = async (ipAddress, port) => {
  try {
    // Ensure ipAddress is a string and port is a number
    if (typeof ipAddress !== "string" || typeof port !== "number") {
      throw new Error("Invalid ipAddress or port");
    }

    const device = await client.connect((host = ipAddress), (port = port));
    return device;
  } catch (error) {
    console.error("Error connecting to device:", error);
    throw new Error("Failed to connect to device");
  }
};

app.post("/connect-device", async (req, res) => {
  const { ipAddress, port } = req.body; // Get IP address and port from request body
  try {
    const device = await connectToDevice(ipAddress, port);
    // console.log('from here')
    console.log(device);
    res.status(200).json({ message: "Connected to device", device });
  } catch (error) {
    console.error("Error connecting to device:", error);
    res
      .status(500)
      .json({ error: "An error occurred while connecting to the device" });
  }
});

app.get("/device-id", async (req, res) => {
  try {
    const deviceID = await getDeviceID();
    if (deviceID) {
      console.log("Device ID retrived", deviceID);
      res.status(200).json({ deviceID });
    } else {
      console.log("No Device found");
      res.status(404).json({ error: "NO device found" });
    }
  } catch (error) {
    console.error("Error retrieving device ID", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/disconnect", async (req, res) => {
  try {
    const deviceID = await getDeviceID();
    if (deviceID) {
      if (client) {
        console.log(req.body);
        const device = await client.disconnect(req.body.ipAddress, 5555);
        console.log("Disconnected");
        // console.log(device);
        // res.status(200).json({ device });
      } else {
        // Handle case where client is not initialized
        res.status(500).json({ error: "ADB client is not initialized" });
      }
    } else {
      // Handle case where deviceID is not available
      res.status(404).json({ error: "Device ID not found" });
    }
  } catch (error) {
    console.error("Error disconnecting device:", error);
    // Handle disconnection error gracefully
    res
      .status(500)
      .json({ error: "Error disconnecting device", details: error });
  }
});

//LOGS PART
app.get("/device-logs", async (req, res) => {
  try {
    const proc = spawn("adb", ["logcat", "-B", "all", "*:F", "*:E"]);
    const reader = logcat.readStream(proc.stdout);
    console.log("here");
    let crashDetected = false;
    let logs = [];

    reader.on("entry", (entry) => {
      // console.log(entry);
      if (
        entry.priority === "F" ||
        entry.priority === "E" ||
        entry.priority === 7 ||
        entry.priority === 6 ||
        entry.message.includes("com.jio.photos")
      ) {
        // if (entry.priority === 7 || entry.priority === 6) {
        //e.mediasharedmp
        console.log("Crash detected");
        // console.log(entry);
        logs.push({ Date: entry.date, Message: entry.message });
        crashDetected = true;
        proc.kill();
        console.log(logs);
      }
    });

    let responseSent = false;

    await new Promise((resolve, reject) => {
      proc.on("exit", (code, signal) => {
        console.log(
          `Logcat process exited with code ${code} and signal ${signal}`
        );
        if (!crashDetected && !responseSent) {
          console.log("No crash detected");
          responseSent = true;
          res.status(200).json({ logs: logs, message: "No crash detected" });
          resolve();
        }
      });

      reader.on("end", () => {
        if (crashDetected && !responseSent) {
          responseSent = true;
          res.status(500).json({ logs: logs, message: "Crash detected" });
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching device logs" });
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////

//INSTALL PART
app.get("/install-apk", async (req, res) => {
  try {
    const devices = await client.listDevices();

    if (devices.length === 0) {
      res.status(404).json({ error: "No devices connected" });
      return;
    }
    const apk = req.query.apkPath;
    for (let i = 0; i < devices.length; i++) {
      console.log(devices[i].id);
      await client.install(devices[i].id, apk);
      console.log(`Installed ${apk} on device ${devices[i].id}`);
    }
    res.send(`Installed ${apk} on all devices`);
  } catch (err) {
    console.error("Lost Connection with Device", err.stack);
    res.status(500).json({ error: "Lost Connection with Device" });
  }
});

app.post("/export-logs", (req, res) => {
  try {
    const logs = req.body.logs;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Logs data is missing or invalid" });
    }

    const fileName = "device_logs.txt"; // Name of the file to be exported
    const filePath = "./logs" + "/" + fileName; // Path where the file will be saved

    // Write logs data to the file
    const data = logs.join("\n"); // Join log messages with newline character
    fs.writeFile(filePath, data, (err) => {
      if (err) {
        console.error("Error writing logs to file:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while exporting logs" });
      }
      console.log("Logs have been exported to file:", fileName);
      res
        .status(200)
        .json({ message: "Logs exported successfully", file: fileName });
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "An error occurred while exporting logs" });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
const sendDeviceIDUpdate = async (res) => {
  const deviceID = await getDeviceID(); // Get the current device ID
  // console.log(deviceID);
  res.write(`data: ${JSON.stringify({ deviceID })}\n\n`); // Send SSE event with device ID
};

app.get("/device-id-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Call sendDeviceIDUpdate initially to send current device ID
  sendDeviceIDUpdate(res);

  // Set up SSE event interval to periodically send updates
  const intervalID = setInterval(() => {
    sendDeviceIDUpdate(res);
  }, 1000); // Example: send update every 1 second

  // Clean up interval when client disconnects
  req.on("close", () => {
    clearInterval(intervalID);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post("/screencap", async (req, res) => {
  try {
    // const devices = await client.listDevices();
    // const device = devices[0].id;

    console.log(req.body);
    const screenCap = await client.screencap(req.body.ipAddress);
    // const screenCap = await client.screencap(devices[1].id);

    // Set headers to indicate a file attachment and its type
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="screenshot.png"'
    );
    res.setHeader("Content-Type", "image/png");

    // Pipe the screencap stream directly to the response
    screenCap
      .pipe(res)
      .on("finish", () => {
        console.log("Screenshot sent as response");
      })
      .on("error", (err) => {
        console.error("Error while streaming screenshot:", err);
        res.status(500).send("Failed to capture screenshot");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to capture screenshot");
  }
});

app.listen(3001, () => {
  console.log("App listening on port 3001!");
});
