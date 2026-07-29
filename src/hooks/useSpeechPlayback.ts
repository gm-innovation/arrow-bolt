import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SAMPLE_RATE = 24000; // PCM devolvido pelo modelo de voz
const MAX_WORDS_PER_CHUNK = 400;

/** Quebra o texto em blocos que cabem em uma requisição de síntese. */
function chunkForTTS(text: string, maxWords = MAX_WORDS_PER_CHUNK): string[] {
  const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;
  const sentences = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const sentence of sentences) {
    if (wordCount(sentence) > maxWords) {
      flush();
      const words = sentence.match(/\S+/g) ?? [];
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      continue;
    }
    if (current && wordCount(current) + wordCount(sentence) > maxWords) flush();
    current += sentence;
  }
  flush();
  return chunks;
}

export function useSpeechPlayback() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const playheadRef = useRef(0);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current = [];
    playheadRef.current = 0;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(async (text: string, id?: string) => {
    const clean = (text ?? '').trim();
    if (!clean) return;

    stop();
    const controller = new AbortController();
    abortRef.current = controller;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    ctxRef.current = ctx;
    playheadRef.current = 0;
    setIsSpeaking(true);
    setSpeakingId(id ?? null);

    let pending = new Uint8Array(0);
    const playChunk = (incoming: Uint8Array) => {
      if (!ctxRef.current) return;
      const bytes = new Uint8Array(pending.length + incoming.length);
      bytes.set(pending);
      bytes.set(incoming, pending.length);
      const usable = bytes.length - (bytes.length % 2);
      pending = bytes.slice(usable);
      if (usable === 0) return;
      const samples = new Int16Array(bytes.buffer, 0, usable / 2);
      const floats = Float32Array.from(samples, (s) => s / 32768);
      const buffer = ctxRef.current.createBuffer(1, floats.length, SAMPLE_RATE);
      buffer.copyToChannel(floats, 0);
      const source = ctxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(ctxRef.current.destination);
      if (playheadRef.current === 0) {
        playheadRef.current = ctxRef.current.currentTime + 0.05;
      } else {
        playheadRef.current = Math.max(playheadRef.current, ctxRef.current.currentTime);
      }
      source.start(playheadRef.current);
      playheadRef.current += buffer.duration;
      sourcesRef.current.push(source);
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Sessão expirada. Faça login novamente.');
        stop();
        return;
      }

      for (const chunk of chunkForTTS(clean)) {
        if (controller.signal.aborted) break;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-text-to-speech`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: chunk }),
            signal: controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          let msg = 'Falha ao gerar a voz.';
          try { msg = (await res.json())?.error ?? msg; } catch { /* noop */ }
          toast.error(msg);
          break;
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
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
              if (evt.type === 'speech.audio.delta' && evt.audio) {
                const binary = atob(evt.audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                playChunk(bytes);
              }
            } catch { /* ignora linhas parciais */ }
          }
        }
      }

      // Deixa o áudio agendado terminar antes de liberar o estado.
      const remaining = Math.max(0, playheadRef.current - (ctxRef.current?.currentTime ?? 0));
      window.setTimeout(() => {
        if (abortRef.current === controller) stop();
      }, remaining * 1000 + 200);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        console.error('Erro na síntese de voz:', e);
        toast.error('Erro ao reproduzir a voz.');
      }
      stop();
    }
  }, [stop]);

  return { isSpeaking, speakingId, speak, stop };
}
