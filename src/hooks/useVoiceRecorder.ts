import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TARGET_SAMPLE_RATE = 16000;
const MIN_BYTES = 2048;

/** Junta os blocos PCM e reamostra (linear) para a taxa alvo. */
function resample(chunks: Float32Array[], fromRate: number, toRate: number): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  if (fromRate === toRate) return merged;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(merged.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = merged[idx] ?? 0;
    const b = merged[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Escreve um WAV 16-bit mono completo (com header) — decodificável em qualquer browser. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

interface TranscriptionAttempt {
  ok: boolean;
  text?: string;
  retryable?: boolean;
  message?: string;
}


interface UseVoiceRecorderOptions {
  /** Recebe a transcrição parcial enquanto o áudio é processado. */
  onPartial?: (text: string) => void;
  /** Recebe a transcrição final. */
  onResult: (text: string) => void;
}


export function useVoiceRecorder({ onPartial, onResult }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  /** Há um áudio gravado que pode ser reenviado sem regravar. */
  const [canRetry, setCanRetry] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  /** Último áudio gravado, para retentativa sem regravar. */
  const lastBlobRef = useRef<Blob | null>(null);


  const teardown = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { nodeRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    setIsRecording(false);
    setDuration(0);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Seu navegador não suporta gravação de áudio.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      toast.error('Permissão de microfone negada. Libere o acesso nas configurações do navegador.');
      return;
    }

    cancelledRef.current = false;
    chunksRef.current = [];
    streamRef.current = stream;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    ctxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (e) => {
      chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(node);
    node.connect(ctx.destination);
    sourceRef.current = source;
    nodeRef.current = node;

    setIsRecording(true);
    setDuration(0);
    timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
  }, [isRecording, isTranscribing]);

  /** Uma tentativa de transcrição. Devolve o resultado para a camada de retentativa. */
  const attempt = useCallback(async (blob: Blob): Promise<TranscriptionAttempt> => {

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, retryable: false, message: 'Sessão expirada. Faça login novamente.' };

    const form = new FormData();
    form.append('file', blob, 'gravacao.wav');
    form.append('language', 'pt');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-speech-to-text`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
        },
        body: form,
      },
    );

    if (!res.ok || !res.body) {
      let message = 'Falha ao transcrever o áudio.';
      try { message = (await res.json())?.error ?? message; } catch { /* noop */ }
      // Só 429 e 5xx valem nova tentativa; os demais repetem o mesmo erro.
      return { ok: false, retryable: res.status === 429 || res.status >= 500, message };
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'transcript.text.delta' && evt.delta) {
            text += evt.delta;
            onPartial?.(text);
          } else if (evt.type === 'transcript.text.done' && typeof evt.text === 'string') {
            text = evt.text;
          }
        } catch { /* ignora linhas parciais */ }
      }
    }

    const finalText = text.trim();
    if (!finalText) {
      return { ok: false, retryable: true, message: 'Não consegui entender o áudio. Tente falar mais perto do microfone.' };
    }
    return { ok: true, text: finalText };
  }, [onPartial]);

  const transcribe = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    lastBlobRef.current = blob;
    setCanRetry(false);
    try {
      let result = await attempt(blob);
      if (!result.ok && result.retryable) {
        // Retentativa automática única, sem exigir nova gravação.
        await new Promise((r) => setTimeout(r, 1200));
        result = await attempt(blob);
      }
      if (result.ok) {
        setCanRetry(false);
        onResult(result.text ?? "");
        return;
      }
      // Mantém o áudio para o botão "tentar novamente".
      setCanRetry(!!result.retryable);
      toast.error(
        result.retryable
          ? `${result.message} O áudio ficou guardado — você pode tentar novamente sem regravar.`
          : result.message,
      );
    } catch (e) {
      console.error('Erro na transcrição:', e);
      setCanRetry(true);
      toast.error('Erro ao transcrever o áudio. O áudio ficou guardado para nova tentativa.');
    } finally {
      setIsTranscribing(false);
    }
  }, [attempt, onResult]);

  /** Reenvia o último áudio gravado. */
  const retry = useCallback(async () => {
    const blob = lastBlobRef.current;
    if (!blob || isRecording || isTranscribing) return;
    await transcribe(blob);
  }, [isRecording, isTranscribing, transcribe]);

  const stop = useCallback(async () => {
    if (!isRecording) return;
    const ctx = ctxRef.current;
    const rate = ctx?.sampleRate ?? 48000;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    teardown();

    if (cancelledRef.current) return;

    const samples = resample(chunks, rate, TARGET_SAMPLE_RATE);
    const blob = encodeWav(samples, TARGET_SAMPLE_RATE);
    if (blob.size < MIN_BYTES) {
      toast.error('Gravação muito curta. Segure o botão e fale por pelo menos 1 segundo.');
      return;
    }
    // Áudio praticamente mudo: avisa antes de gastar tempo com o envio.
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;
    if (rms < 0.006) {
      toast.error('Não te ouvi — o áudio saiu quase mudo. Fale mais perto do microfone e grave de novo.');
      return;
    }
    await transcribe(blob);
  }, [isRecording, teardown, transcribe]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    chunksRef.current = [];
    lastBlobRef.current = null;
    setCanRetry(false);
    teardown();
  }, [teardown]);

  return { isRecording, isTranscribing, duration, canRetry, start, stop, cancel, retry };
}

