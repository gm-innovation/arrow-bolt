import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { textForSpeech } from '@/lib/voice/audio';

const SAMPLE_RATE = 24000; // PCM devolvido pelo modelo de voz

export interface SpeechQueueOptions {
  engine?: string;
  voice?: string;
  speed?: number;
  instructions?: string;
}

/**
 * Fila de síntese frase a frase, cancelável.
 * A voz começa a tocar na primeira frase, sem esperar a resposta inteira —
 * e uma interrupção do usuário (barge-in) corta tudo imediatamente.
 */
export function useSpeechQueue() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const playheadRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const optsRef = useRef<SpeechQueueOptions>({});
  const firstAudioAtRef = useRef<number | null>(null);
  const enqueuedAtRef = useRef<number | null>(null);

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      playheadRef.current = 0;
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  /** Cancela a fala em andamento e descarta o que estava na fila. */
  const cancel = useCallback(() => {
    queueRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    sourcesRef.current.forEach((s) => {
      try { s.stop(); } catch { /* noop */ }
    });
    sourcesRef.current = [];
    playheadRef.current = 0;
    runningRef.current = false;
    firstAudioAtRef.current = null;
    enqueuedAtRef.current = null;
    setIsSpeaking(false);
  }, []);

  useEffect(() => () => {
    cancel();
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, [cancel]);

  const playPcmChunk = useCallback((ctx: AudioContext, bytes: Uint8Array) => {
    const usable = bytes.length - (bytes.length % 2);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, SAMPLE_RATE);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (playheadRef.current <= ctx.currentTime) {
      playheadRef.current = ctx.currentTime + 0.05;
    }
    source.start(playheadRef.current);
    playheadRef.current += buffer.duration;
    sourcesRef.current.push(source);
    if (firstAudioAtRef.current === null) firstAudioAtRef.current = Date.now();
  }, []);

  const synthesize = useCallback(async (text: string, controller: AbortController) => {
    const ctx = await ensureContext();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-to-speech`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...(optsRef.current.engine ? { engine: optsRef.current.engine } : {}),
          ...(optsRef.current.voice ? { voice: optsRef.current.voice } : {}),
          ...(typeof optsRef.current.speed === 'number' ? { speed: optsRef.current.speed } : {}),
          ...(optsRef.current.instructions ? { instructions: optsRef.current.instructions } : {}),
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok || !res.body) return;

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done || controller.signal.aborted) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'speech.audio.delta' && evt.audio) {
            const binary = atob(evt.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            playPcmChunk(ctx, bytes);
          }
        } catch { /* ignora linhas parciais */ }
      }
    }
  }, [ensureContext, playPcmChunk]);

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsSpeaking(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      while (queueRef.current.length > 0 && !controller.signal.aborted) {
        const next = queueRef.current.shift()!;
        await synthesize(next, controller);
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        console.error('Erro na síntese de voz (fila):', e);
      }
    } finally {
      runningRef.current = false;
      if (abortRef.current === controller) {
        const ctx = ctxRef.current;
        const remaining = Math.max(0, playheadRef.current - (ctx?.currentTime ?? 0));
        window.setTimeout(() => {
          if (abortRef.current === controller && !runningRef.current && queueRef.current.length === 0) {
            sourcesRef.current = [];
            setIsSpeaking(false);
          }
        }, remaining * 1000 + 150);
      }
    }
  }, [synthesize]);

  /** Coloca uma frase na fila e começa a tocar assim que possível. */
  const enqueue = useCallback((text: string, opts?: SpeechQueueOptions) => {
    const clean = textForSpeech(text);
    if (!clean) return;
    if (opts) optsRef.current = { ...optsRef.current, ...opts };
    if (enqueuedAtRef.current === null) enqueuedAtRef.current = Date.now();
    queueRef.current.push(clean);
    void drain();
  }, [drain]);

  /** Latência entre a primeira frase enfileirada e o primeiro áudio agendado (ms). */
  const getTimeToFirstAudio = useCallback(
    () => (firstAudioAtRef.current && enqueuedAtRef.current
      ? firstAudioAtRef.current - enqueuedAtRef.current
      : null),
    [],
  );

  return { isSpeaking, enqueue, cancel, getTimeToFirstAudio };
}
