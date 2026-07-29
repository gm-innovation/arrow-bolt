import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VoicePref = 'off' | 'auto' | 'on';

const STORAGE_KEY = 'marina:voice_pref';

function readLocal(): VoicePref {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'auto' || v === 'on' ? v : 'off';
}

/** Preferência de resposta em voz da Marina, sincronizada com o perfil do usuário. */
export function useVoicePref() {
  const { user } = useAuth();
  const [pref, setPref] = useState<VoicePref>(readLocal);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('voice_pref')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.voice_pref) return;
        const value = data.voice_pref as VoicePref;
        setPref(value);
        localStorage.setItem(STORAGE_KEY, value);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const update = useCallback(async (next: VoicePref) => {
    setPref(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (!user?.id) return;
    await supabase.from('profiles').update({ voice_pref: next }).eq('id', user.id);
  }, [user?.id]);

  /** Alterna entre off → auto → on → off. */
  const cycle = useCallback(() => {
    update(pref === 'off' ? 'auto' : pref === 'auto' ? 'on' : 'off');
  }, [pref, update]);

  return { pref, setPref: update, cycle };
}
