import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceTurnMetrics {
  conversationId?: string | null;
  speechMs?: number | null;
  transcribeMs?: number | null;
  modelMs?: number | null;
  firstAudioMs?: number | null;
  totalMs?: number | null;
  interrupted?: boolean;
}

/** Registra a latência de cada turno de voz para diagnóstico de gargalo. */
export function useVoiceTelemetry() {
  const { profile, user } = useAuth();

  const logTurn = useCallback(async (m: VoiceTurnMetrics) => {
    const userId = user?.id ?? (profile as any)?.id;
    if (!userId) return;
    try {
      await supabase.from('ai_voice_turns').insert({
        user_id: userId,
        company_id: (profile as any)?.company_id ?? null,
        conversation_id: m.conversationId ?? null,
        speech_ms: m.speechMs ?? null,
        transcribe_ms: m.transcribeMs ?? null,
        model_ms: m.modelMs ?? null,
        first_audio_ms: m.firstAudioMs ?? null,
        total_ms: m.totalMs ?? null,
        interrupted: m.interrupted ?? false,
        channel: 'voice',
      });
    } catch (e) {
      // Telemetria nunca deve atrapalhar a conversa.
      console.warn('Falha ao registrar turno de voz', e);
    }
  }, [profile, user?.id]);

  /** Dispara a compactação da memória da sessão em segundo plano. */
  const compactSession = useCallback(async (conversationId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-compact-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });
    } catch (e) {
      console.warn('Falha ao compactar a sessão', e);
    }
  }, []);

  return { logTurn, compactSession };
}
