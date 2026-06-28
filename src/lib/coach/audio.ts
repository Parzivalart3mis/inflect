'use client'

/* Audio plumbing for the Gemini Live coach.
 * Mic is captured and downsampled to 16 kHz PCM16 (what Live expects);
 * model audio arrives as 24 kHz PCM16 and is played back via a small queue. */

export const INPUT_SAMPLE_RATE = 16000
export const OUTPUT_SAMPLE_RATE = 24000

function getAudioContextCtor(): typeof AudioContext {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  )
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

function float32ToPcm16(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out.buffer
}

function downsample(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (outputRate >= inputRate) return input
  const ratio = inputRate / outputRate
  const newLength = Math.round(input.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetInput = 0
  while (offsetResult < newLength) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetInput = nextOffsetInput
  }
  return result
}

/**
 * Captures the microphone. `acquire()` must be called from within the user
 * gesture (it opens the mic and resumes the AudioContext, which iOS requires).
 * Audio is only streamed once `setSender()` is wired up after the Live socket
 * connects. Reports input level for a "listening" indicator.
 */
export class MicCapture {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private sink: GainNode | null = null
  private sender: ((base64: string) => void) | null = null
  private lastLevelAt = 0

  constructor(private onLevel?: (level: number) => void) {}

  async acquire(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    this.ctx = new (getAudioContextCtor())()
    // iOS Safari starts contexts suspended — resume inside the gesture.
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    // Zero-gain sink keeps the processor running without echoing to speakers.
    this.sink = this.ctx.createGain()
    this.sink.gain.value = 0

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)

      if (this.onLevel) {
        const now = performance.now()
        if (now - this.lastLevelAt > 80) {
          this.lastLevelAt = now
          let sum = 0
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
          this.onLevel(Math.min(1, Math.sqrt(sum / input.length) * 4))
        }
      }

      if (this.sender) {
        const down = downsample(input, this.ctx!.sampleRate, INPUT_SAMPLE_RATE)
        this.sender(arrayBufferToBase64(float32ToPcm16(down)))
      }
    }

    this.source.connect(this.processor)
    this.processor.connect(this.sink)
    this.sink.connect(this.ctx.destination)
  }

  /** Begin streaming chunks to the Live socket. */
  setSender(sender: (base64: string) => void) {
    this.sender = sender
  }

  setMuted(muted: boolean) {
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted))
  }

  stop(): void {
    this.sender = null
    this.processor?.disconnect()
    this.source?.disconnect()
    this.sink?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close()
    this.processor = null
    this.source = null
    this.sink = null
    this.stream = null
    this.ctx = null
  }
}

/** Sequentially plays 24 kHz PCM16 chunks from the model. */
export class PcmPlayer {
  private ctx: AudioContext | null = null
  private nextStartTime = 0
  private sources = new Set<AudioBufferSourceNode>()

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (getAudioContextCtor())()
    return this.ctx
  }

  /** Resume on a user gesture (iOS requires this). */
  async resume(): Promise<void> {
    await this.ensureCtx().resume()
  }

  enqueue(base64: string): void {
    const ctx = this.ensureCtx()
    const int16 = base64ToInt16(base64)
    if (int16.length === 0) return

    const float = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 32768

    const buffer = ctx.createBuffer(1, float.length, OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(float, 0)

    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.connect(ctx.destination)

    const now = ctx.currentTime
    this.nextStartTime = Math.max(this.nextStartTime, now)
    node.start(this.nextStartTime)
    this.nextStartTime += buffer.duration

    this.sources.add(node)
    node.onended = () => this.sources.delete(node)
  }

  /** Stop everything currently scheduled (barge-in / interruption). */
  clear(): void {
    for (const node of this.sources) {
      try {
        node.stop()
      } catch {
        // already stopped
      }
    }
    this.sources.clear()
    this.nextStartTime = 0
  }

  stop(): void {
    this.clear()
    void this.ctx?.close()
    this.ctx = null
  }
}
