import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

type WatcherOptions = {
  backgroundMessage: string;
  backgroundTitle: string;
  requestPermissions: boolean;
  stale: boolean;
  distanceFilter: number;
};

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  bearing: number | null;
};

type BackgroundGeolocationPlugin = {
  addWatcher(
    options: WatcherOptions,
    callback: (position?: Position, error?: { code: string; message: string }) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
};

const LAST_SENT_KEY = 'arrow:bg-tracking:last-sent';
const MIN_INTERVAL_MS = 60_000;

/**
 * Rastreamento GPS em segundo plano (apenas app nativo).
 * Requer consentimento explícito do colaborador (profiles.location_tracking_consent).
 */
export const useBackgroundTracking = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const watcherId = useRef<string | null>(null);
  const pluginRef = useRef<BackgroundGeolocationPlugin | null>(null);

  const supported = isNativeApp();

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      const [technician, profileRow] = await Promise.all([
        supabase.from('technicians').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('profiles')
          .select('location_tracking_consent')
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      if (!active) return;
      if (technician.data) setTechnicianId(technician.data.id);
      setHasConsent(Boolean((profileRow.data as any)?.location_tracking_consent));
    })();
    return () => { active = false; };
  }, [user?.id]);


  const loadPlugin = useCallback(async () => {
    if (pluginRef.current) return pluginRef.current;
    const mod = await import('@capacitor-community/background-geolocation');
    pluginRef.current = (mod as any).BackgroundGeolocation as BackgroundGeolocationPlugin;
    return pluginRef.current;
  }, []);

  const persistPosition = useCallback(
    async (position: Position) => {
      if (!technicianId) return;
      const last = Number(localStorage.getItem(LAST_SENT_KEY) || 0);
      if (Date.now() - last < MIN_INTERVAL_MS) return;
      localStorage.setItem(LAST_SENT_KEY, String(Date.now()));

      const { error } = await supabase.from('technician_locations').insert({
        technician_id: technicianId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed,
        heading: position.bearing,
        location_type: 'tracking',
      } as any);

      if (error) console.error('[useBackgroundTracking] erro ao salvar posição:', error);
    },
    [technicianId]
  );


  const stop = useCallback(async () => {
    if (!watcherId.current) {
      setIsTracking(false);
      return;
    }
    try {
      const plugin = await loadPlugin();
      await plugin.removeWatcher({ id: watcherId.current });
    } catch (error) {
      console.error('[useBackgroundTracking] erro ao parar:', error);
    } finally {
      watcherId.current = null;
      setIsTracking(false);
    }
  }, [loadPlugin]);

  const start = useCallback(async () => {
    if (!supported) {
      toast.info('Rastreamento em segundo plano disponível apenas no aplicativo Android');
      return false;
    }
    if (!hasConsent) {
      toast.error('É necessário autorizar o rastreamento de localização');
      return false;
    }
    if (watcherId.current) return true;

    setStarting(true);
    try {
      const plugin = await loadPlugin();
      watcherId.current = await plugin.addWatcher(
        {
          backgroundTitle: 'Arrow — jornada em campo',
          backgroundMessage: 'Sua localização está sendo registrada durante o serviço.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 50,
        },
        (position, error) => {
          if (error) {
            if (error.code === 'NOT_AUTHORIZED') {
              toast.error('Permissão de localização negada', {
                description: 'Habilite "Permitir o tempo todo" nas configurações do aparelho.',
              });
            }
            return;
          }
          if (position) void persistPosition(position);
        }
      );
      setIsTracking(true);
      toast.success('Rastreamento iniciado');
      return true;
    } catch (error) {
      console.error('[useBackgroundTracking] erro ao iniciar:', error);
      toast.error('Não foi possível iniciar o rastreamento');
      return false;
    } finally {
      setStarting(false);
    }
  }, [supported, hasConsent, loadPlugin, persistPosition]);

  const setConsent = useCallback(
    async (value: boolean) => {
      if (!user?.id) return false;
      const { error } = await supabase
        .from('profiles')
        .update({
          location_tracking_consent: value,
          location_tracking_consent_at: value ? new Date().toISOString() : null,
        } as any)
        .eq('id', user.id);

      if (error) {
        toast.error('Não foi possível salvar a autorização');
        return false;
      }
      await refreshProfile?.();
      if (!value) await stop();
      return true;
    },
    [user?.id, refreshProfile, stop]
  );

  useEffect(() => {
    return () => {
      if (watcherId.current && pluginRef.current) {
        void pluginRef.current.removeWatcher({ id: watcherId.current });
      }
    };
  }, []);

  return { supported, hasConsent, isTracking, starting, start, stop, setConsent };
};
