import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { encodeWav, frameRms, resamplePcm, TARGET_SAMPLE_RATE } from '@/lib/voice/audio';

/** Estados visíveis da sessão de voz contínua. */
export type LiveVoiceState =
  | 'off'
  | 'listening'   // microfone aberto, silêncio
  | 'hearing'     // usuário falando
  | 'transcribing'
  | 'thinking'
  | 'speaking';

const FRAME_SIZE = 2048;
const SILENCE_MS = 900;          // silêncio que encerra o turno
const HESITATION_MS = 350;       // pausa curta que NÃO encerra o turno
const MIN_SPEECH_MS = 400;       // fala mais curta que isso é descartada
const MAX_SEGMENT_MS = 30000;    // corta turnos muito longos
const PREROLL_FRAMES = 8;        // ~350ms antes do início detectado
const BASE_THRESHOLD = 0.012;
const MIN_BYTES = 2048;

interface UseLiveVoiceOptions {
  /** Transcrição final de um trecho de fala do usuário. */
  onUtterance: (text: string, metrics: { speechMs: number; transcribeMs: number }) => void;
  /** Transcrição parcial, para feedback na tela. */
  onPartial?: (text: string) => void;
  /** O usuário voltou a falar enquanto a Marina falava. */
  onBargeIn?: () => void;
  /** A Marina está falando agora (eleva o limiar para evitar eco). */
  agentSpeaking?: boolean;
  /** A Marina está processando a resposta. */
  agentThinking?: boolean;
}

/**
 * Sessão de voz contínua: microfone aberto, detecção de fala e de silêncio
 * no próprio navegador, com interrupção (barge-in) da fala da Marina.
 */
export function useLiveVoice({
  onUtterance,
  onPartial,
  onBargeIn,
  agentSpeaking = false,
  agentThinking = false,
}: UseLiveVoiceOptions) {
  const [isActive, setIsActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partial, setPartial] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);

  const framesRef = useRef<Float32Array[]>([]);   // trecho em captura
  const prerollRef = useRef<Float32Array[]>([]);  // buffer circular antes da fala
  const speakingRef = useRef(false);              // usuário falando
  const speechStartRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const noiseFloorRef = useRef(BASE_THRESHOLD);
  const agentSpeakingRef = useRef(agentSpeaking);
  const bargeFramesRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => { agentSpeakingRef.current = agentSpeaking; }, [agentSpeaking]);

  const transcribe = useCallback(async (blob: Blob, speechMs: number) => {
    setIsTranscribing(true);
    const startedAt = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const form = new FormData();
      form.append('file', blob, 'trecho.wav');
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
        let msg = 'Não consegui transcrever esse trecho.';
        try { msg = (await res.json())?.error ?? msg; } catch { /* noop */ }
        toast.error(msg);
        return;
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
              setPartial(text);
              onPartial?.(text);
            } else if (evt.type === 'transcript.text.done' && typeof evt.text === 'string') {
              text = evt.text;
            }
          } catch { /* ignora linhas parciais */ }
        }
      }

      const finalText = text.trim();
      setPartial('');
      if (!finalText) return;
      onUtterance(finalText, { speechMs, transcribeMs: Date.now() - startedAt });
    } catch (e) {
      console.error('Erro na transcrição contínua:', e);
    } finally {
      setIsTranscribing(false);
    }
  }, [onPartial, onUtterance]);

  const finalizeSegment = useCallback((rate: number) => {
    const frames = framesRef.current;
    framesRef.current = [];
    speakingRef.current = false;
    const speechMs = Math.max(0, Date.now() - speechStartRef.current);
    if (!frames.length || speechMs < MIN_SPEECH_MS) return;

    const samples = resamplePcm(frames, rate, TARGET_SAMPLE_RATE);
    const blob = encodeWav(samples, TARGET_SAMPLE_RATE);
    if (blob.size < MIN_BYTES) return;
    busyRef.current = true;
    void transcribe(blob, speechMs).finally(() => { busyRef.current = false; });
  }, [transcribe]);

  const stop = useCallback(() => {
    try { nodeRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    framesRef.current = [];
    prerollRef.current = [];
    speakingRef.current = false;
    bargeFramesRef.current = 0;
    setLevel(0);
    setPartial('');
    setIsActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    if (isActive) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Este dispositivo não permite microfone contínuo. Use o botão de gravar.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      toast.error('Permissão de microfone negada. Libere o acesso e tente de novo.');
      return;
    }

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(FRAME_SIZE, 1, 1);
    const frameMs = (FRAME_SIZE / ctx.sampleRate) * 1000;

    node.onaudioprocess = (e) => {
      const frame = new Float32Array(e.inputBuffer.getChannelData(0));
      const rms = frameRms(frame);
      setLevel(Math.min(1, rms * 12));

      // Piso de ruído adaptativo (sobe devagar, desce rápido no silêncio).
      if (!speakingRef.current) {
        noiseFloorRef.current = noiseFloorRef.current * 0.95 + rms * 0.05;
      }
      const floor = Math.max(BASE_THRESHOLD, noiseFloorRef.current * 2.2);
      // Durante a fala da Marina exige-se mais energia para não captar o eco.
      const threshold = agentSpeakingRef.current ? floor * 2.2 : floor;
      const isVoice = rms > threshold;
      const now = Date.now();

      if (!speakingRef.current) {
        prerollRef.current.push(frame);
        if (prerollRef.current.length > PREROLL_FRAMES) prerollRef.current.shift();

        if (!isVoice) { bargeFramesRef.current = 0; return; }

        // Interrupção: só corta a Marina depois de fala sustentada.
        if (agentSpeakingRef.current) {
          bargeFramesRef.current += 1;
          if (bargeFramesRef.current * frameMs < 250) return;
          onBargeIn?.();
        }
        if (busyRef.current) return;

        bargeFramesRef.current = 0;
        speakingRef.current = true;
        speechStartRef.current = now;
        lastVoiceAtRef.current = now;
        framesRef.current = [...prerollRef.current];
        prerollRef.current = [];
        framesRef.current.push(frame);
        return;
      }

      framesRef.current.push(frame);
      if (isVoice) lastVoiceAtRef.current = now;

      const silenceFor = now - lastVoiceAtRef.current;
      const speechFor = now - speechStartRef.current;
      if (silenceFor > HESITATION_MS && silenceFor >= SILENCE_MS) {
        finalizeSegment(ctx.sampleRate);
      } else if (speechFor > MAX_SEGMENT_MS) {
        finalizeSegment(ctx.sampleRate);
      }
    };

    source.connect(node);
    node.connect(ctx.destination);

    streamRef.current = stream;
    ctxRef.current = ctx;
    sourceRef.current = source;
    nodeRef.current = node;
    noiseFloorRef.current = BASE_THRESHOLD;
    setIsActive(true);
  }, [finalizeSegment, isActive, onBargeIn]);

  const state: LiveVoiceState = !isActive
    ? 'off'
    : agentSpeaking
      ? 'speaking'
      : isTranscribing
        ? 'transcribing'
        : agentThinking
          ? 'thinking'
          : speakingRef.current
            ? 'hearing'
            : 'listening';

  return { isActive, state, level, partial, start, stop };
}
