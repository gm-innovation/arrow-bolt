import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveVoice } from '@/hooks/useLiveVoice';
import { useSpeechQueue } from '@/hooks/useSpeechQueue';
import { useVoiceTelemetry } from '@/hooks/useVoiceTelemetry';
import { takeCompleteSentences } from '@/lib/voice/audio';
import type { VoiceSession, VoiceSessionConfig, VoiceSessionState } from '@/lib/voice/transport';

/**
 * Implementação ENCADEADA do contrato `VoiceSession`:
 * microfone → transcrição → modelo → síntese frase a frase → áudio.
 *
 * É o único transporte disponível hoje. Para o full-duplex real, criar outra
 * implementação do mesmo contrato — ver `src/lib/voice/FULL-DUPLEX.md`.
 */
export function useVoiceSession({
  isThinking,
  assistant,
  speechOptions,
  conversationId,
  onUtterance,
  onTurnComplete,
}: VoiceSessionConfig): VoiceSession {
  const speechQueue = useSpeechQueue();
  const { logTurn } = useVoiceTelemetry();

  const [isActive, setIsActive] = useState(false);

  // Estado do turno em andamento e do trecho de texto já falado.
  const turnRef = useRef<{
    startedAt: number;
    sentAt: number;
    speechMs: number;
    transcribeMs: number;
    interrupted: boolean;
  } | null>(null);
  const spokenLenRef = useRef(0);
  const pendingTailRef = useRef('');
  const streamKeyRef = useRef<string | null>(null);
  const prevThinkingRef = useRef(false);

  // Refs para os callbacks e opções: o áudio é montado uma vez e não pode
  // carregar versões antigas.
  const onUtteranceRef = useRef(onUtterance);
  const onTurnCompleteRef = useRef(onTurnComplete);
  const speechOptionsRef = useRef(speechOptions);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => { onUtteranceRef.current = onUtterance; }, [onUtterance]);
  useEffect(() => { onTurnCompleteRef.current = onTurnComplete; }, [onTurnComplete]);
  useEffect(() => { speechOptionsRef.current = speechOptions; }, [speechOptions]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  const live = useLiveVoice({
    agentSpeaking: speechQueue.isSpeaking,
    agentThinking: isThinking,
    onBargeIn: () => {
      speechQueue.cancel();
      if (turnRef.current) turnRef.current.interrupted = true;
    },
    onUtterance: (text, metrics) => {
      speechQueue.cancel();
      spokenLenRef.current = 0;
      pendingTailRef.current = '';
      streamKeyRef.current = null;
      turnRef.current = {
        startedAt: Date.now() - metrics.speechMs - metrics.transcribeMs,
        sentAt: Date.now(),
        speechMs: metrics.speechMs,
        transcribeMs: metrics.transcribeMs,
        interrupted: false,
      };
      onUtteranceRef.current(text);
    },
  });

  // Saída de áudio: fala a resposta frase a frase, conforme o texto chega.
  useEffect(() => {
    if (!isActive || !assistant) return;
    if (streamKeyRef.current !== assistant.key) {
      streamKeyRef.current = assistant.key;
      spokenLenRef.current = 0;
      pendingTailRef.current = '';
    }
    const full = assistant.content ?? '';
    const fresh = full.slice(spokenLenRef.current);
    spokenLenRef.current = full.length;
    if (!fresh && (isThinking || !pendingTailRef.current.trim())) return;
    const { sentences, rest } = takeCompleteSentences(pendingTailRef.current + fresh);
    pendingTailRef.current = rest;
    sentences.forEach((s) => speechQueue.enqueue(s, speechOptionsRef.current));
    if (!isThinking && pendingTailRef.current.trim()) {
      speechQueue.enqueue(pendingTailRef.current, speechOptionsRef.current);
      pendingTailRef.current = '';
    }
  }, [assistant, isThinking, isActive, speechQueue]);

  // Telemetria: registra a latência ao fim de cada turno.
  useEffect(() => {
    if (prevThinkingRef.current && !isThinking && isActive && turnRef.current) {
      const t = turnRef.current;
      turnRef.current = null;
      void logTurn({
        conversationId: conversationIdRef.current,
        speechMs: t.speechMs,
        transcribeMs: t.transcribeMs,
        modelMs: Date.now() - t.sentAt,
        firstAudioMs: speechQueue.getTimeToFirstAudio(),
        totalMs: Date.now() - t.startedAt,
        interrupted: t.interrupted,
      });
      onTurnCompleteRef.current?.();
    }
    prevThinkingRef.current = isThinking;
  }, [isThinking, isActive, logTurn, speechQueue]);

  const start = useCallback(async () => {
    await live.start();
    setIsActive(true);
  }, [live]);

  const stop = useCallback(() => {
    live.stop();
    speechQueue.cancel();
    turnRef.current = null;
    spokenLenRef.current = 0;
    pendingTailRef.current = '';
    streamKeyRef.current = null;
    setIsActive(false);
  }, [live, speechQueue]);

  const interrupt = useCallback(() => {
    speechQueue.cancel();
    if (turnRef.current) turnRef.current.interrupted = true;
  }, [speechQueue]);

  const state: VoiceSessionState = isActive ? live.state : 'off';

  return {
    isActive: isActive && live.isActive,
    state,
    level: live.level,
    partial: live.partial,
    isSpeaking: speechQueue.isSpeaking,
    start,
    stop,
    interrupt,
  };
}
