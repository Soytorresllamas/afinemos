export type MicErrorCode = 'permiso-denegado' | 'sin-microfono' | 'desconocido';

export class MicError extends Error {
  constructor(public code: MicErrorCode) {
    super(code);
    this.name = 'MicError';
  }
}

function toMicError(err: unknown): MicError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      return new MicError('permiso-denegado');
    }
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      return new MicError('sin-microfono');
    }
  }
  return new MicError('desconocido');
}

export interface MicSession {
  sampleRate: number;
  /** Llena y devuelve el buffer interno con las muestras más recientes. */
  readBuffer(): Float32Array;
  stop(): void;
}

export async function startMic(bufferSize = 2048): Promise<MicSession> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (err) {
    throw toMicError(err);
  }
  const ctx = new AudioContext();
  await ctx.resume();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = bufferSize;
  source.connect(analyser);
  const buf = new Float32Array(bufferSize);
  return {
    sampleRate: ctx.sampleRate,
    readBuffer() {
      analyser.getFloatTimeDomainData(buf);
      return buf;
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
