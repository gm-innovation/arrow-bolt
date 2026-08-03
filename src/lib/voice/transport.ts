/**
 * Contrato único da sessão de voz da Marina.
 *
 * O chat conversa APENAS com este contrato. Ele não sabe (e não deve saber) se
 * por baixo existe transcrição e síntese separadas (modo encadeado, atual) ou um
 * canal de áudio nativo full-duplex.
 *
 * Ponto de troca: ver `src/lib/voice/FULL-DUPLEX.md`.
 */

/** Estados visíveis da sessão de voz. */
export type VoiceSessionState =
  | 'off'
  | 'listening'    // microfone aberto, silêncio
  | 'hearing'      // usuário falando
  | 'transcribing' // convertendo a fala do usuário em texto
  | 'thinking'     // a Marina está processando
  | 'speaking';    // a Marina está falando

/** Métricas de um turno completo de voz. */
export interface VoiceTurnTiming {
  /** Duração da fala do usuário. */
  speechMs: number;
  /** Tempo até a fala virar texto (0 no full-duplex, onde não há etapa separada). */
  transcribeMs: number;
}

/** Opções de timbre/velocidade da voz da Marina. */
export interface VoiceSpeechOptions {
  voice?: string;
  speed?: number;
  instructions?: string;
}

/** Última mensagem da assistente, em streaming, para a camada de saída de áudio. */
export interface AssistantStream {
  /** Chave estável da mensagem — muda a cada nova resposta. */
  key: string;
  /** Conteúdo acumulado até agora. */
  content: string;
}

export interface VoiceSessionConfig {
  /** A Marina está processando a resposta agora. */
  isThinking: boolean;
  /** Resposta em streaming a ser falada (ignorada por transportes full-duplex). */
  assistant: AssistantStream | null;
  /** Timbre e velocidade da voz. */
  speechOptions?: VoiceSpeechOptions;
  /** Conversa ativa, usada apenas para telemetria. */
  conversationId?: string | null;
  /** Fala do usuário pronta para virar mensagem. */
  onUtterance: (text: string) => void;
  /** Turno encerrado (já registrado na telemetria). */
  onTurnComplete?: () => void;
}

/** Sessão de voz ativa, do ponto de vista da interface. */
export interface VoiceSession {
  isActive: boolean;
  state: VoiceSessionState;
  /** Nível de voz captado, de 0 a 1. */
  level: number;
  /** Transcrição parcial do que o usuário está dizendo. */
  partial: string;
  /** A Marina está emitindo áudio agora. */
  isSpeaking: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Corta a fala da Marina imediatamente. */
  interrupt: () => void;
}
