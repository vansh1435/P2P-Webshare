import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wifi,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sha256Hex } from "./lib/crypto.js";
import { downloadBlob, readBlobAsArrayBuffer } from "./lib/file.js";
import { formatBytes, formatPercent, formatSpeed } from "./lib/format.js";
import { createSocket, getSignalingUrl } from "./lib/socket.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 64 * 1024;
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const EMPTY_TRANSFER = {
  phase: "idle",
  fileName: "",
  totalBytes: 0,
  sentBytes: 0,
  receivedBytes: 0,
  percent: 0,
  speedBps: 0,
  verifiedChunks: 0,
  totalChunks: 0,
  finalHash: ""
};

function getRoomIdFromLocation() {
  const pathMatch = window.location.pathname.match(/^\/room\/([A-Za-z0-9_-]+)/);
  const queryRoom = new URLSearchParams(window.location.search).get("room");
  return pathMatch?.[1] || queryRoom || "";
}

function humanPhase(phase) {
  const labels = {
    idle: "Idle",
    selected: "File selected",
    connecting: "Connecting",
    waiting: "Waiting for peer",
    hashing: "Hashing file",
    offered: "Offer ready",
    sending: "Sending",
    receiving: "Receiving",
    finalizing: "Verifying",
    complete: "Complete",
    interrupted: "Interrupted",
    error: "Needs attention"
  };

  return labels[phase] || phase;
}

function metricProgress(bytes, totalBytes, startedAt) {
  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.1);
  return {
    percent: totalBytes ? Math.min(100, (bytes / totalBytes) * 100) : 0,
    speedBps: bytes / elapsedSeconds
  };
}

function StatusDot({ state }) {
  const isConnected = state === "connected" || state === "open" || state === "connected";
  return <span className={`status-dot ${isConnected ? "is-live" : ""}`} aria-hidden="true" />;
}

function FileDropZone({ file, disabled, error, onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList) {
    const nextFile = fileList?.[0];
    if (nextFile) onFileSelect(nextFile);
  }

  return (
    <label
      className={`drop-zone ${isDragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <UploadCloud size={36} aria-hidden="true" />
      <span className="drop-title">{file ? file.name : "Drop a file or choose one"}</span>
      <span className="drop-meta">
        {file ? `${formatBytes(file.size)} selected` : "Maximum 50 MB for the MVP path"}
      </span>
      {error ? <span className="inline-error">{error}</span> : null}
    </label>
  );
}

function ProgressMeter({ transfer }) {
  const activeBytes =
    transfer.phase === "receiving" || transfer.phase === "finalizing"
      ? transfer.receivedBytes
      : transfer.sentBytes;

  return (
    <section className="meter-block" aria-label="Transfer progress">
      <div className="meter-topline">
        <span>{humanPhase(transfer.phase)}</span>
        <strong>{formatPercent(transfer.percent)}</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${transfer.percent}%` }} />
      </div>
      <div className="metric-grid">
        <span>
          <small>Data</small>
          {formatBytes(activeBytes)} / {formatBytes(transfer.totalBytes)}
        </span>
        <span>
          <small>Speed</small>
          {formatSpeed(transfer.speedBps)}
        </span>
        <span>
          <small>Chunks</small>
          {transfer.verifiedChunks} / {transfer.totalChunks}
        </span>
      </div>
    </section>
  );
}

function App() {
  const initialRoomId = useMemo(getRoomIdFromLocation, []);
  const [mode, setMode] = useState(initialRoomId ? "receiver" : "sender");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId);
  const [inviteLink, setInviteLink] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [socketState, setSocketState] = useState("idle");
  const [peerState, setPeerState] = useState("idle");
  const [channelState, setChannelState] = useState("idle");
  const [notice, setNotice] = useState("");
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER);
  const [logs, setLogs] = useState([]);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const fileRef = useRef(null);
  const roomIdRef = useRef(initialRoomId);
  const roleRef = useRef(initialRoomId ? "receiver" : "sender");
  const remotePeerRef = useRef("");
  const iceQueueRef = useRef([]);
  const senderTransferRef = useRef({});
  const receiverTransferRef = useRef({});
  const didAutoJoinRef = useRef(false);

  useEffect(() => {
    fileRef.current = file;
  }, [file]);

  useEffect(() => {
    if (!initialRoomId || didAutoJoinRef.current) return undefined;
    didAutoJoinRef.current = true;
    joinRoom(initialRoomId);

    return () => {
      closeEverything();
    };
  }, [initialRoomId]);

  function addLog(message) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    setLogs((items) => [{ time, message }, ...items].slice(0, 8));
  }

  function connectSocket() {
    if (socketRef.current) {
      if (!socketRef.current.connected) socketRef.current.connect();
      return socketRef.current;
    }

    const socket = createSocket();
    socketRef.current = socket;
    setSocketState("connecting");

    socket.on("connect", () => {
      setSocketState("connected");
      addLog(`Signaling connected through ${getSignalingUrl()}`);
    });

    socket.on("disconnect", () => {
      setSocketState("disconnected");
      addLog("Signaling disconnected.");
    });

    socket.on("connect_error", (error) => {
      setSocketState("error");
      setNotice(error.message || "Could not connect to the signaling server.");
    });

    socket.on("peer:joined", async ({ peerId }) => {
      if (roleRef.current !== "sender") return;
      addLog("Receiver joined the room.");
      await startSenderPeer(peerId);
    });

    socket.on("peer:left", ({ role }) => {
      const peerLabel = role === "sender" ? "Sender" : "Receiver";
      addLog(`${peerLabel} disconnected.`);
      setNotice(`${peerLabel} disconnected. The transfer was paused.`);
      setTransfer((current) =>
        current.phase === "complete" ? current : { ...current, phase: "interrupted" }
      );
      closePeer();
    });

    socket.on("room:expired", ({ reason }) => {
      setNotice(reason || "Room expired.");
      setTransfer((current) => ({ ...current, phase: "interrupted" }));
      closePeer();
    });

    socket.on("signal", async (message) => {
      try {
        await handleSignal(message);
      } catch (error) {
        setNotice(error.message || "Could not process WebRTC signaling.");
        addLog("WebRTC signaling failed.");
      }
    });

    socket.connect();
    return socket;
  }

  function closePeer() {
    channelRef.current?.close();
    peerRef.current?.close();
    channelRef.current = null;
    peerRef.current = null;
    remotePeerRef.current = "";
    iceQueueRef.current = [];
    setPeerState("closed");
    setChannelState("closed");
  }

  function closeEverything() {
    closePeer();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }

  function resetSender() {
    closeEverything();
    roleRef.current = "sender";
    roomIdRef.current = "";
    senderTransferRef.current = {};
    receiverTransferRef.current = {};
    setMode("sender");
    setFile(null);
    setFileError("");
    setRoomId("");
    setInviteLink("");
    setCopyState("idle");
    setSocketState("idle");
    setPeerState("idle");
    setChannelState("idle");
    setNotice("");
    setTransfer(EMPTY_TRANSFER);
    setLogs([]);
  }

  function handleFileSelect(nextFile) {
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("Choose a file under 50 MB for this browser-memory MVP.");
      setTransfer(EMPTY_TRANSFER);
      return;
    }

    setFile(nextFile);
    setFileError("");
    setNotice("");
    setTransfer({
      ...EMPTY_TRANSFER,
      phase: "selected",
      fileName: nextFile.name,
      totalBytes: nextFile.size
    });
  }

  function createRoom() {
    if (!fileRef.current) {
      setFileError("Select a file first.");
      return;
    }

    const socket = connectSocket();
    roleRef.current = "sender";
    setMode("sender");
    setTransfer((current) => ({ ...current, phase: "connecting" }));

    socket.emit(
      "room:create",
      {
        name: fileRef.current.name,
        size: fileRef.current.size,
        type: fileRef.current.type
      },
      (response) => {
        if (!response?.ok) {
          setNotice(response?.error || "Could not create a room.");
          setTransfer((current) => ({ ...current, phase: "error" }));
          return;
        }

        const nextLink = `${window.location.origin}/room/${response.roomId}`;
        roomIdRef.current = response.roomId;
        setRoomId(response.roomId);
        setInviteLink(nextLink);
        setTransfer((current) => ({ ...current, phase: "waiting" }));
        addLog(`Room ${response.roomId} is ready.`);
      }
    );
  }

  function joinRoom(nextRoomId) {
    const socket = connectSocket();
    roleRef.current = "receiver";
    roomIdRef.current = nextRoomId;
    setMode("receiver");
    setRoomId(nextRoomId);
    setTransfer({ ...EMPTY_TRANSFER, phase: "connecting" });

    socket.emit("room:join", { roomId: nextRoomId }, (response) => {
      if (!response?.ok) {
        setNotice(response?.error || "Could not join this room.");
        setTransfer((current) => ({ ...current, phase: "error" }));
        return;
      }

      remotePeerRef.current = response.senderId;
      setTransfer((current) => ({
        ...current,
        phase: "waiting",
        fileName: response.fileMeta?.name || "",
        totalBytes: response.fileMeta?.size || 0
      }));
      addLog("Joined room. Waiting for sender offer.");
    });
  }

  function makePeerConnection(peerId) {
    closePeer();
    iceQueueRef.current = [];

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    remotePeerRef.current = peerId;
    setPeerState("connecting");

    peer.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      sendSignal(peerId, "ice-candidate", candidate.toJSON());
    };

    peer.onconnectionstatechange = () => {
      setPeerState(peer.connectionState);

      if (["failed", "disconnected", "closed"].includes(peer.connectionState)) {
        setTransfer((current) =>
          current.phase === "complete" ? current : { ...current, phase: "interrupted" }
        );
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "failed") {
        peer.restartIce?.();
      }
    };

    return peer;
  }

  function sendSignal(to, type, payload) {
    socketRef.current?.emit("signal", {
      roomId: roomIdRef.current,
      to,
      type,
      payload
    });
  }

  async function startSenderPeer(peerId) {
    const peer = makePeerConnection(peerId);
    const channel = peer.createDataChannel("file-transfer", { ordered: true });
    setupSenderChannel(channel);

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSignal(peerId, "offer", peer.localDescription.toJSON());
    addLog("WebRTC offer sent.");
  }

  async function acceptOffer(senderId, offer) {
    const peer = makePeerConnection(senderId);
    peer.ondatachannel = (event) => setupReceiverChannel(event.channel);

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushQueuedIce();
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendSignal(senderId, "answer", peer.localDescription.toJSON());
    addLog("WebRTC answer sent.");
  }

  async function handleSignal({ from, type, payload }) {
    if (type === "offer" && roleRef.current === "receiver") {
      await acceptOffer(from, payload);
      return;
    }

    if (type === "answer" && roleRef.current === "sender" && peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload));
      await flushQueuedIce();
      addLog("WebRTC answer received.");
      return;
    }

    if (type === "ice-candidate") {
      await addIceCandidate(payload);
    }
  }

  async function addIceCandidate(candidate) {
    if (!peerRef.current) {
      iceQueueRef.current.push(candidate);
      return;
    }

    if (!peerRef.current.remoteDescription?.type) {
      iceQueueRef.current.push(candidate);
      return;
    }

    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async function flushQueuedIce() {
    while (iceQueueRef.current.length && peerRef.current?.remoteDescription?.type) {
      const candidate = iceQueueRef.current.shift();
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  function setupSenderChannel(channel) {
    channelRef.current = channel;
    channel.binaryType = "arraybuffer";
    setChannelState(channel.readyState);

    channel.onopen = async () => {
      setChannelState("open");
      addLog("Data channel opened.");
      await prepareSenderTransfer(channel);
    };

    channel.onclose = () => {
      setChannelState("closed");
      addLog("Data channel closed.");
    };

    channel.onerror = () => {
      setChannelState("error");
      setNotice("Data channel error.");
    };

    channel.onmessage = async (event) => {
      if (typeof event.data !== "string") return;
      const message = JSON.parse(event.data);

      if (message.type === "receiver-ready") {
        senderTransferRef.current.active = true;
        senderTransferRef.current.startedAt = performance.now();
        setTransfer((current) => ({ ...current, phase: "sending" }));
        await sendNextChunk();
      }

      if (message.type === "chunk-ack") {
        await handleChunkAck(message);
      }

      if (message.type === "transfer-complete") {
        setTransfer((current) => ({
          ...current,
          phase: "complete",
          percent: 100,
          verifiedChunks: current.totalChunks
        }));
        addLog("Receiver verified the file.");
      }

      if (message.type === "receiver-error") {
        setNotice(message.error || "Receiver could not verify the file.");
        setTransfer((current) => ({ ...current, phase: "error" }));
      }
    };
  }

  async function prepareSenderTransfer(channel) {
    const selectedFile = fileRef.current;
    if (!selectedFile) return;

    setTransfer((current) => ({ ...current, phase: "hashing" }));
    addLog("Hashing file before transfer.");

    const fileBuffer = await readBlobAsArrayBuffer(selectedFile);
    const fileHash = await sha256Hex(fileBuffer);
    const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE) || 1;

    senderTransferRef.current = {
      active: false,
      file: selectedFile,
      fileHash,
      totalChunks,
      nextIndex: 0,
      sentBytes: 0,
      chunkSize: CHUNK_SIZE,
      retries: new Map(),
      startedAt: performance.now(),
      sending: false,
      lastChunk: null
    };

    channel.send(
      JSON.stringify({
        type: "metadata",
        metadata: {
          name: selectedFile.name,
          size: selectedFile.size,
          mime: selectedFile.type || "application/octet-stream",
          chunkSize: CHUNK_SIZE,
          totalChunks,
          fileHash
        }
      })
    );

    setTransfer((current) => ({
      ...current,
      phase: "offered",
      fileName: selectedFile.name,
      totalBytes: selectedFile.size,
      totalChunks,
      finalHash: fileHash
    }));
    addLog("Metadata sent to receiver.");
  }

  async function sendNextChunk() {
    const state = senderTransferRef.current;
    const channel = channelRef.current;

    if (!state.active || state.sending || !channel || channel.readyState !== "open") return;

    if (state.nextIndex >= state.totalChunks) {
      channel.send(JSON.stringify({ type: "sender-complete" }));
      setTransfer((current) => ({ ...current, phase: "finalizing" }));
      return;
    }

    state.sending = true;

    try {
      const index = state.nextIndex;
      const start = index * state.chunkSize;
      const end = Math.min(start + state.chunkSize, state.file.size);
      const buffer = await readBlobAsArrayBuffer(state.file.slice(start, end));
      const hash = await sha256Hex(buffer);

      state.lastChunk = {
        index,
        size: buffer.byteLength
      };

      channel.send(
        JSON.stringify({
          type: "chunk-meta",
          index,
          size: buffer.byteLength,
          hash
        })
      );
      channel.send(buffer);
    } catch (error) {
      setNotice(error.message || "Could not read a file chunk.");
      setTransfer((current) => ({ ...current, phase: "error" }));
    } finally {
      state.sending = false;
    }
  }

  async function handleChunkAck(message) {
    const state = senderTransferRef.current;

    if (message.index !== state.nextIndex) return;

    if (!message.ok) {
      const retryCount = (state.retries.get(message.index) || 0) + 1;
      state.retries.set(message.index, retryCount);

      if (retryCount > 3) {
        setNotice(`Chunk ${message.index + 1} failed verification too many times.`);
        setTransfer((current) => ({ ...current, phase: "error" }));
        channelRef.current?.send(
          JSON.stringify({ type: "sender-error", error: "Chunk verification failed." })
        );
        return;
      }

      addLog(`Retrying chunk ${message.index + 1}.`);
      await sendNextChunk();
      return;
    }

    state.sentBytes += state.lastChunk?.size || 0;
    state.nextIndex += 1;

    const progress = metricProgress(state.sentBytes, state.file.size, state.startedAt);
    setTransfer((current) => ({
      ...current,
      phase: "sending",
      sentBytes: state.sentBytes,
      verifiedChunks: state.nextIndex,
      percent: progress.percent,
      speedBps: progress.speedBps
    }));

    await sendNextChunk();
  }

  function setupReceiverChannel(channel) {
    channelRef.current = channel;
    channel.binaryType = "arraybuffer";
    setChannelState(channel.readyState);

    channel.onopen = () => {
      setChannelState("open");
      addLog("Data channel opened.");
    };

    channel.onclose = () => {
      setChannelState("closed");
      addLog("Data channel closed.");
    };

    channel.onerror = () => {
      setChannelState("error");
      setNotice("Data channel error.");
    };

    channel.onmessage = async (event) => {
      try {
        if (typeof event.data === "string") {
          await handleReceiverControl(JSON.parse(event.data));
          return;
        }

        const buffer =
          event.data instanceof ArrayBuffer ? event.data : await event.data.arrayBuffer();
        await handleIncomingChunk(buffer);
      } catch (error) {
        setNotice(error.message || "Could not handle incoming transfer data.");
        setTransfer((current) => ({ ...current, phase: "error" }));
      }
    };
  }

  async function handleReceiverControl(message) {
    const channel = channelRef.current;

    if (message.type === "metadata") {
      const metadata = message.metadata;
      receiverTransferRef.current = {
        metadata,
        chunks: new Array(metadata.totalChunks),
        pendingChunk: null,
        receivedBytes: 0,
        verifiedChunks: 0,
        startedAt: performance.now()
      };

      setTransfer({
        ...EMPTY_TRANSFER,
        phase: "receiving",
        fileName: metadata.name,
        totalBytes: metadata.size,
        totalChunks: metadata.totalChunks,
        finalHash: metadata.fileHash
      });
      addLog("Metadata received. Starting verified download.");
      channel?.send(JSON.stringify({ type: "receiver-ready" }));
      return;
    }

    if (message.type === "chunk-meta") {
      receiverTransferRef.current.pendingChunk = message;
      return;
    }

    if (message.type === "sender-complete") {
      addLog("Sender finished transmitting.");
      return;
    }

    if (message.type === "sender-error") {
      setNotice(message.error || "Sender stopped the transfer.");
      setTransfer((current) => ({ ...current, phase: "error" }));
    }
  }

  async function handleIncomingChunk(buffer) {
    const channel = channelRef.current;
    const state = receiverTransferRef.current;
    const chunkMeta = state.pendingChunk;

    if (!chunkMeta) {
      throw new Error("Received a chunk before its verification metadata.");
    }

    const hash = await sha256Hex(buffer);

    if (hash !== chunkMeta.hash || buffer.byteLength !== chunkMeta.size) {
      state.pendingChunk = null;
      channel?.send(
        JSON.stringify({
          type: "chunk-ack",
          index: chunkMeta.index,
          ok: false
        })
      );
      return;
    }

    state.chunks[chunkMeta.index] = buffer;
    state.pendingChunk = null;
    state.receivedBytes += buffer.byteLength;
    state.verifiedChunks += 1;

    const progress = metricProgress(
      state.receivedBytes,
      state.metadata.size,
      state.startedAt
    );

    setTransfer((current) => ({
      ...current,
      phase: "receiving",
      receivedBytes: state.receivedBytes,
      verifiedChunks: state.verifiedChunks,
      percent: progress.percent,
      speedBps: progress.speedBps
    }));

    channel?.send(
      JSON.stringify({
        type: "chunk-ack",
        index: chunkMeta.index,
        ok: true
      })
    );

    if (state.verifiedChunks === state.metadata.totalChunks) {
      await finalizeReceiverDownload();
    }
  }

  async function finalizeReceiverDownload() {
    const state = receiverTransferRef.current;
    const channel = channelRef.current;
    setTransfer((current) => ({ ...current, phase: "finalizing", percent: 100 }));
    addLog("Verifying final file hash.");

    const blob = new Blob(state.chunks, {
      type: state.metadata.mime || "application/octet-stream"
    });
    const finalBuffer = await readBlobAsArrayBuffer(blob);
    const finalHash = await sha256Hex(finalBuffer);

    if (finalHash !== state.metadata.fileHash) {
      setNotice("Final SHA-256 check failed. Download was not saved.");
      setTransfer((current) => ({ ...current, phase: "error" }));
      channel?.send(
        JSON.stringify({
          type: "receiver-error",
          error: "Final SHA-256 verification failed."
        })
      );
      return;
    }

    downloadBlob(blob, state.metadata.name);
    setTransfer((current) => ({
      ...current,
      phase: "complete",
      percent: 100,
      receivedBytes: state.metadata.size,
      verifiedChunks: state.metadata.totalChunks,
      speedBps: current.speedBps
    }));
    channel?.send(JSON.stringify({ type: "transfer-complete" }));
    addLog("File verified and downloaded.");
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  const isBusy = ["connecting", "waiting", "hashing", "offered", "sending", "receiving"].includes(
    transfer.phase
  );

  const statusIcon =
    peerState === "connected" || channelState === "open" ? (
      <Wifi size={18} aria-hidden="true" />
    ) : (
      <WifiOff size={18} aria-hidden="true" />
    );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WebRTC DataChannel</p>
          <h1>P2P Web Share</h1>
        </div>
        <div className="topbar-status">
          {statusIcon}
          <span>{channelState === "open" ? "Direct channel open" : "No direct channel"}</span>
        </div>
      </header>

      <div className="workspace">
        <section className="primary-surface">
          {mode === "sender" ? (
            <>
              <div className="section-heading">
                <span className="mode-badge">Sender</span>
                <h2>Create a share room</h2>
              </div>

              <FileDropZone
                file={file}
                disabled={transfer.phase === "sending" || transfer.phase === "hashing"}
                error={fileError}
                onFileSelect={handleFileSelect}
              />

              <div className="action-row">
                <button className="primary-button" disabled={!file || isBusy} onClick={createRoom}>
                  {transfer.phase === "connecting" ? (
                    <Loader2 className="spin" size={18} aria-hidden="true" />
                  ) : (
                    <Link2 size={18} aria-hidden="true" />
                  )}
                  Create room
                </button>
                <button className="ghost-button" onClick={resetSender}>
                  <RefreshCw size={18} aria-hidden="true" />
                  Reset
                </button>
              </div>

              {inviteLink ? (
                <div className="invite-box">
                  <div>
                    <small>Invite link</small>
                    <strong>{inviteLink}</strong>
                  </div>
                  <button className="icon-button" onClick={copyInviteLink} title="Copy invite link">
                    {copyState === "copied" ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : (
                      <Copy size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="section-heading">
                <span className="mode-badge">Receiver</span>
                <h2>Receive shared file</h2>
              </div>
              <div className="receiver-panel">
                <Download size={42} aria-hidden="true" />
                <span>Room {roomId}</span>
                <strong>{transfer.fileName || "Waiting for sender metadata"}</strong>
              </div>
              <div className="action-row">
                <button className="ghost-button" onClick={() => window.location.assign("/")}>
                  <RefreshCw size={18} aria-hidden="true" />
                  Start over
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="status-surface">
          <div className="section-heading compact">
            <span className="mode-badge">Live status</span>
            <h2>{transfer.fileName || "No active file"}</h2>
          </div>

          <ProgressMeter transfer={transfer} />

          <div className="status-list">
            <span>
              <StatusDot state={socketState} />
              Signaling: {socketState}
            </span>
            <span>
              <StatusDot state={peerState} />
              Peer: {peerState}
            </span>
            <span>
              <StatusDot state={channelState} />
              Data channel: {channelState}
            </span>
          </div>

          <div className="assurance-strip">
            <span>
              <ShieldCheck size={18} aria-hidden="true" />
              SHA-256 chunks
            </span>
            <span>
              <FileArchive size={18} aria-hidden="true" />
              Server stores 0 bytes
            </span>
          </div>

          {transfer.finalHash ? (
            <div className="hash-box">
              <small>File SHA-256</small>
              <code>{transfer.finalHash}</code>
            </div>
          ) : null}

          {notice ? (
            <div className="notice-box">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{notice}</span>
            </div>
          ) : null}

          <div className="activity-log">
            <small>Activity</small>
            {logs.length ? (
              logs.map((item) => (
                <p key={`${item.time}-${item.message}`}>
                  <span>{item.time}</span>
                  {item.message}
                </p>
              ))
            ) : (
              <p>
                <span>--:--:--</span>
                Ready
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default App;
