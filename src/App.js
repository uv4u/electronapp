import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./style.css";
import "./modalcss.scss";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import androdebug from "./androdebug.png";

// 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 api key

import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

//Modal imports
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

async function main(logs) {
  const chatCompletion = await getGroqChatCompletion(logs);
  // Print the completion returned by the LLM.
  // process.stdout.write(chatCompletion.choices[0]?.message?.content || "");
  console.log(chatCompletion.choices[0]?.message?.content);
  var analysedString = chatCompletion.choices[0]?.message?.content;
  analysedString = analysedString.replace(/,(?=\s*["\w]+:)/g, ",\\n");
  return analysedString;
}
async function getGroqChatCompletion(logs) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `Explain and give solution for ${logs}. Keep it short but helpful`,
      },
    ],
    model: "mixtral-8x7b-32768",
  });
}

const App = () => {
  const [apkPath, setApkPath] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("");
  const [connectedDevice, setConnectedDevice] = useState(null);
  // const [open, setOpen] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsloading] = React.useState(false);
  const [scroll, setScroll] = React.useState("paper");
  const [analysedLog, setAnalysedLog] = useState("working on it...");

  const notify = (req) => toast(req);

  useEffect(() => {
    // Function to handle SSE events
    const handleSSE = (event) => {
      // console.log(event);

      const eventData = JSON.parse(event.data);
      setDeviceId(eventData.deviceID);
    };

    // Open SSE connection
    const eventSource = new EventSource(
      "http://localhost:3001/device-id-stream"
    );
    eventSource.addEventListener("message", handleSSE);

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, []);

  //INSTALL APP
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsloading(true);

    try {
      console.log("Hello");
      const response = await axios.get("http://localhost:3001/install-apk", {
        params: { apkPath: apkPath },
      });
      // alert(response.data)
      notify(response.data);
      // alert(`Installed APK: ${response.data} on device: ${response.data}`);
      setApkPath("");
    } catch (error) {
      if (error.response) {
        console.error(
          "Error:",
          error.response.status,
          error.response.statusText
        );
        if (error.response.data && error.response.data.error) {
          // alert(`Error occurred while installing APK: ${error.response.data.error}`);
          notify(
            `Error occurred while installing APK: ${error.response.data.error}`
          );
          setDeviceId("");
        } else {
          notify(
            `Error occurred while installing APK: ${error.response.status} ${error.response.statusText}`
          );
        }
      } else if (error.request) {
        console.error("Error:", "No response received from the server.");
        notify(
          "Error occurred while installing APK: No response received from the server."
        );
      } else {
        console.error("Error:", error.message);
        alert(`Error occurred while installing APK: ${error.message}`);
      }

      setApkPath("");
    }
    setIsloading(false);
  };

  const handleFetchLogs = async () => {
    setIsloading(true);
    try {
      const response = await axios.get("http://localhost:3001/device-logs");
      console.log(response);
      // setLogs(response.data.logs);
      setError("");
      setOpen(false);
    } catch (error) {
      console.log("Here   ", error);
      if (error.message === "Network Error") {
        notify("Device Connection Failed");
      } else {
        if (error.response.data) {
          console.log(error.response.data.logs[0]);
          var logString = JSON.stringify(error.response.data.logs);
          // logString = logString.replace(/,(?=\s*["\w]+:)/g, ",\\n");
          var logsArray = JSON.parse(logString);
          var formattedLogs = "";
          logsArray.forEach(function (log) {
            formattedLogs += log.Date + "\n" + log.Message + "\n\n";
          });
          // console.log(logString);
          setLogs(formattedLogs);
          // setLogs(error.response.data.logs[0].Message);
          // setLogs(error.response.data.logs);
          notify("Logs taken successfully!");
        }
      }
    }
    setIsloading(false);
  };

  const handleAnalyseLogs = async () => {
    console.log(logs);
    const response = await main(logs);
    setAnalysedLog(response);
    return;
  };

  const handleClickOpen = (scrollType) => () => {
    handleAnalyseLogs();
    setOpen(true);
    setScroll(scrollType);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const descriptionElementRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [open]);

  const eraseText = () => {
    setLogs([]);
    setAnalysedLog("working on it...");
  };

  const handleExportLogs = async () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "logs.txt";

    // Trigger the download by programmatically clicking the anchor element
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  //STB Connection through ipAddress and Port
  const connectToDevice = async () => {
    try {
      console.log("here");
      setLoading(true);
      const response = await axios.post(
        "http://localhost:3001/connect-device",
        {
          ipAddress: ipAddress,
          port: parseInt(port), // Convert port to integer
        }
      );
      setConnectedDevice(response.data.device);
      console.log(response.data.device);
      notify(`Connected to device: ${response.data.deviceInfo.id}`);
    } catch (error) {
      console.log("Error connecting to device: ", error);
      notify("Failed to connect to device");
    } finally {
      setLoading(false);
      window.location.reload();
    }
  };

  //Disconnecting STB
  const handleDisconnect = async () => {
    try {
      const response = await axios.post("http://localhost:3001/disconnect");
      if (response.status >= 200 && response.status < 300) {
        notify("Device disconnected successfully");
      } else {
        console.error("Unexpected response status:", response.status);
        notify("Failed to disconnect device");
      }
    } catch (error) {
      console.error("Error disconnecting device:", error);
      notify("Failed to disconnect device");
    } finally {
      window.location.reload();
    }
  };

  return (
    <div>
      <nav className="navbar" style={{ background: "#3559E0", height: 58 }}>
        <div className="container-fluid">
          <span
            className="navbar-brand h1"
            style={{ color: "#EEEDEB", fontFamily: "Apple Color Emoji" }}
          >
            <img
              src={androdebug}
              style={{ height: "2.1em", width: "auto" }}
            ></img>
            {/* <b>ADBWeb</b> */}
          </span>
        </div>
      </nav>

      <div
        className="container-sm d-flex align-items-center"
        style={{ padding: 50, gap: "100px" }}
      >
        <div className="flex-shrink-0">
          <lottie-player
            src="https://lottie.host/becde4ed-b29a-401b-89d6-1e826c5429c1/fLbhQkmJFc.json"
            background="transparent"
            speed="1"
            style={{ width: "200px", height: "200px" }}
            loop
            autoplay
            direction="1"
            mode="normal"
          ></lottie-player>
        </div>
        <div
          className="flex-grow-1 ms-3 container-sm card text-white mb-3"
          style={{
            padding: 0,
            borderRadius: 80,
            background: "#313131",
            borderColor: "#3559E0",
            borderWidth: 0.5,
          }}
        >
          <div className="card-body" style={{ padding: 60 }}>
            <div className="jumbotron">
              {!deviceId && (
                <div className="IP">
                  <h6>Connect to Device</h6>
                  <div
                    className="d-flex align-items-center"
                    style={{ gap: 20 }}
                  >
                    <div>
                      <input
                        type="text"
                        className="form-control input1"
                        // style={{ width: "50%" }}
                        value={ipAddress}
                        placeholder="Enter IP address"
                        onChange={(e) => setIpAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        className="form-control input1"
                        // style={{ width: "25%" }}
                        value={port}
                        placeholder="Enter port (i.e. 5555)"
                        onChange={(e) => setPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className={`button-10 ${
                      !(ipAddress.trim() && port.trim()) ? "" : "valid"
                    }`}
                    onClick={connectToDevice}
                    disabled={loading}
                  >
                    <span className="button-content-10">
                      {loading ? "Connecting..." : "Connect"}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div>
                  <label htmlFor="deviceId" className="form-label">
                    <h6>Device ID:</h6>
                  </label>

                  {deviceId ? (
                    <div
                      className="d-flex align-items-center"
                      style={{ gap: 20 }}
                      readOnly
                    >
                      {/* <div>{"deviceId"}</div> */}
                      <div>
                        <input
                          type="text"
                          className="form-control input1"
                          value={deviceId}
                        />
                      </div>
                      <div>
                        {!(deviceId.indexOf(":") === -1) && (
                          <button
                            className="button-10"
                            onClick={handleDisconnect}
                          >
                            <span className="button-content-10">
                              Disconnect
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <h6>No device connected</h6>
                  )}
                </div>
              </div>
              <label htmlFor="apkPath" className="form-label">
                <h6>APK Path:</h6>
              </label>
              <div className="d-flex align-items-center" style={{ gap: 24 }}>
                <input
                  type="text"
                  className="form-control input1"
                  id="apkPath"
                  placeholder="Enter the Path"
                  style={{ width: "50%" }}
                  value={apkPath}
                  onChange={(e) => {
                    setApkPath(e.target.value);
                    console.log(e.target.value);
                    // try {
                    //   const { ipcRenderer } = window.require("electron");
                    //   const buttonCreated = document.getElementById("apkPath");

                    //   buttonCreated.addEventListener("click", function (e) {
                    //     ipcRenderer.send("open-file-dialog-for-file");
                    //     console.log("Hello");
                    //   });
                    //   ipcRenderer.on("selected-file", function (e, path) {
                    //     console.log("Full path: ", path);
                    //   });
                    // } catch (error) {
                    //   console.log(error);
                    // }
                  }}
                />
                <button
                  className={`button-10 ${!apkPath.trim() ? "" : "valid"}`}
                  type="submit"
                  disabled={!apkPath.trim()}
                >
                  <span className={`button-content-10`}>Install APK</span>
                </button>
              </div>
              <Backdrop
                sx={{
                  color: "#fff",
                  zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
                open={isLoading}
              >
                <CircularProgress color="inherit" />
              </Backdrop>
              {open && <Backdrop />}
            </form>
            <div className="mb-3">
              <label htmlFor="logTextArea" className="form-label">
                <h6>Logs:</h6>
              </label>
              {logs.length === 0 ? (
                <p>No Logs found</p>
              ) : (
                <textarea
                  className="form-control"
                  id="logTextArea"
                  rows="10"
                  wrap="off"
                  cols="30"
                  style={{
                    borderRadius: 30,
                    background: "none",
                    padding: 10,
                    boxShadow: "inset 2px 5px 10px rgb(5, 5, 5)",
                    color: "#fff",
                    fontSize: "0.8rem",
                    borderTop: "white",
                    borderBottom: "white",
                    borderLeft: "white",
                    borderRight: "white",
                  }}
                  value={logs}
                  readOnly
                ></textarea>
              )}
            </div>
            <div className="d-flex" style={{ gap: 20 }}>
              <button className="button-10" onClick={handleFetchLogs}>
                {/* FETCH */}
                <span className="button-content-10">Fetch Logs</span>
              </button>
              <button
                className={`button-10`}
                disabled={!logs.length}
                onClick={eraseText}
              >
                <span className="button-content-10">Clear</span>
              </button>

              <button
                className={`button-10`}
                onClick={handleExportLogs}
                disabled={!logs.length}
              >
                <span className="button-content-10">Save Logs</span>
              </button>

              {/* /////////////MODAL//////////// */}
              <button
                className="button-10"
                onClick={handleClickOpen("paper")}
                disabled={!logs.length}
              >
                <span className="button-content-10">Analyse Logs</span>
              </button>
              <Dialog
                open={open}
                onClose={handleClose}
                scroll={scroll}
                aria-labelledby="scroll-dialog-title"
                aria-describedby="scroll-dialog-description"
              >
                <DialogTitle id="scroll-dialog-title">Log Analysis</DialogTitle>
                <DialogContent dividers={scroll === "paper"}>
                  <DialogContentText
                    id="scroll-dialog-description"
                    ref={descriptionElementRef}
                    tabIndex={-1}
                  >
                    <p>{analysedLog}</p>
                  </DialogContentText>
                </DialogContent>
              </Dialog>
              {/* ///////////////////////// */}
            </div>
          </div>
          <ToastContainer />
        </div>
      </div>
    </div>
  );
};

export default App;
