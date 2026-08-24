/**
 * Minimal 16-bit PCM WAV encoder. WAVs are reproducible *exports* of a
 * recipe+seed, never the source of truth.
 */

export interface PcmInput {
  channels: Float32Array[];
  sampleRate: number;
}

export function encodeWav(input: PcmInput): ArrayBuffer {
  const { channels, sampleRate } = input;
  if (!channels.length) throw new Error("encodeWav: no channels");
  const numCh = channels.length;
  const frames = channels[0].length;
  for (const ch of channels)
    if (ch.length !== frames) throw new Error("encodeWav: channel length mismatch");

  const bytesPerSample = 2;
  const dataSize = frames * numCh * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * bytesPerSample, true);
  view.setUint16(32, numCh * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const clamped = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, Math.round(clamped * 32767), true);
      offset += 2;
    }
  }
  return buffer;
}

export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++)
    channels.push(buffer.getChannelData(ch));
  return encodeWav({ channels, sampleRate: buffer.sampleRate });
}
