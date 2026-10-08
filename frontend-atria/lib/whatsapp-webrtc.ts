const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

function createPeer(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

async function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      if (pc.localDescription?.sdp) {
        resolve();
        return;
      }
      reject(new Error("Timeout ao negociar áudio da ligação"));
    }, 5000);

    function onChange() {
      if (pc.iceGatheringState !== "complete") return;
      window.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }

    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

async function attachMicrophone(pc: RTCPeerConnection): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  for (const track of stream.getAudioTracks()) {
    pc.addTrack(track, stream);
  }
  return stream;
}

export async function createOutgoingOffer(): Promise<{
  pc: RTCPeerConnection;
  stream: MediaStream;
  sdp: string;
}> {
  const pc = createPeer();
  const stream = await attachMicrophone(pc);
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    stream.getTracks().forEach((track) => track.stop());
    pc.close();
    throw new Error("Não foi possível criar o áudio da ligação");
  }
  return { pc, stream, sdp };
}

export async function createAnswerFromOffer(offerSdp: string): Promise<{
  pc: RTCPeerConnection;
  stream: MediaStream;
  sdp: string;
}> {
  const pc = createPeer();
  const stream = await attachMicrophone(pc);
  await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    stream.getTracks().forEach((track) => track.stop());
    pc.close();
    throw new Error("Não foi possível atender a ligação");
  }
  return { pc, stream, sdp };
}

export async function applyRemoteAnswer(
  pc: RTCPeerConnection,
  answerSdp: string,
): Promise<void> {
  if (pc.remoteDescription) return;
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
}

export function setMuted(stream: MediaStream | null, muted: boolean) {
  stream?.getAudioTracks().forEach((track) => {
    track.enabled = !muted;
  });
}

export function closeCall(
  pc: RTCPeerConnection | null,
  stream: MediaStream | null,
) {
  stream?.getTracks().forEach((track) => track.stop());
  if (pc && pc.signalingState !== "closed") {
    pc.close();
  }
}
