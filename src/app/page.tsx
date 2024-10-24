"use client"
import Janus, { JanusJS } from "janus-gateway";
import { useEffect, useState } from "react";
import { json } from "stream/consumers";
import adapter from "webrtc-adapter";
export default function Home() {
  const [initialized, setInitialized] = useState(false)
  const [janusHandle, setJanusHandle] = useState<Janus>()
  const [pluginHandle, setPluginHandle] = useState<JanusJS.PluginHandle>()
  const [inRoom, setInRoom] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  function getPluginHandle() {
    console.log("Accessing plugin handle: ", pluginHandle)
    return pluginHandle;
  }
  useEffect(() => {
    Janus.init({
      debug: true,
      dependencies: Janus.useDefaultDependencies(
        {
          adapter: adapter
        }
      ), // or: Janus.useOldDependencies() to get the behaviour of previous Janus versions
      callback: function () {
        console.log("initialized")
        setInitialized(true)
        let janus = new Janus({
          server: "https://janus.anydone.net/janus",
          // server: "http://localhost:8088/janus",
          // iceServers: [
          // { urls: "stun:stun.l.google.com:19302" },
          // ],
          success: function () {
            setJanusHandle(janus)
            console.log("Janus session created: ", janus.getSessionId())
          }

        })
      }
    });
  }, [Janus])
  function attachPlugin() {
    let localHandle: JanusJS.PluginHandle;
    if (!janusHandle) {
      alert("No janus session")
      return;
    }
    janusHandle.attach({
      plugin: "janus.plugin.videoroom",
      error: function (error) {
        alert(`Error:  ${error}`)
      },
      success: function (handle) {
        localHandle = handle
        setPluginHandle(localHandle)
      },
      onmessage: function (message, jsep) {
        console.log("message: ", message)
        if (jsep) {
          if (localHandle == undefined) {
            alert("No plugin handle, failed to handle remote jsep")
            return;
          }
          localHandle.handleRemoteJsep({
            jsep: jsep,
            success: function (data) {
              console.log("Handle Remote Jsep success: ", data)
            }
          })

        }
      }
    })
  }
  function joinRoom() {
    if (!pluginHandle) {
      alert("Plugin not attached")
      return;
    }
    pluginHandle.send({
      message: {
        request: "join",
        ptype: "publisher",
        room: 1234
      },
      success: function (data) {
        console.log("Joined room: ", data)
        setInRoom(true)
      }
    })
  }

  function startPublishing() {
    if (!pluginHandle) {
      alert("No plugin handle")
      return;
    }
    pluginHandle.createOffer({
      tracks: [
        { type: "video", capture: true },
        { type: "audio", capture: true }
      ],
      success: function (jsep) {
        pluginHandle.webrtcStuff.mySdp = {
          type: jsep.type || "",
          sdp: jsep.sdp || ""
        }
        pluginHandle.send({
          message: {
            request: "publish",
            display: "sandesh",
          },
          jsep: jsep
        })

        setIsPublishing(true)
      }
    })
  }

  function startRecording() {
    console.log("Staring Recording")
    if (!pluginHandle) {
      alert("No plugin handle")
      return
    }
    pluginHandle.send({
      message: {
        "request": "enable_recording",
        "room": 1234,
        "record": true,
        "start_timestamp": Date.now()
      }
    })
    setIsRecording(true)
  }
  function stopRecording() {
    console.log("Stopping Recording")
    if (!pluginHandle) {
      alert("No plugin handle")
      return
    }
    pluginHandle.send({
      message: {
        "request": "enable_recording",
        "room": 1234,
        "record": false,
        "start_timestamp": Date.now()
      }
    })
    setIsRecording(false)
  }
  return (
    <div>
      {initialized ?
        <div>
          <div> {JSON.stringify(pluginHandle)} </div>
          <button onClick={attachPlugin} className="border border-black p-3"> Attach plugin </button>
          {pluginHandle ? <div>
            <button onClick={joinRoom} className="border p-3 border-black"> Join room 1234 </button>
            {inRoom ? <div>
              <div>Room id: {1234}</div>
              <div>
                <button className="border border-black p-3" onClick={startPublishing}> Publish</button>
              </div>
              {isPublishing ?
                <div>
                  {isRecording ? <button className="border border-black p-3" onClick={stopRecording}>Stop Record</button> : <button className="border border-black p-3" onClick={startRecording}> Start Record</button>}

                </div>
                : <div> Not Publishing</div>}
            </div> : "Not in room"}
          </div> : "Plugin not attached"}
        </div>
        : <div>Not initialized</div>}
    </div>
  );
}

