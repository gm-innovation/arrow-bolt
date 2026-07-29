import { useCallback, useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Login por biometria (digital / face) no app nativo.
 * Serve como bloqueio de reentrada: o app pede biometria antes de liberar a sessão salva.
 */
export const useBiometricAuth = () => {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [available, setAvailable] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState('Biometria');
  const [checking, setChecking] = useState(true);

  const enabled = Boolean(profile?.biometric_login_enabled);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isNativeApp()) {
        if (active) { setAvailable(false); setChecking(false); }
        return;
      }
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        const info = await BiometricAuth.checkBiometry();
        if (!active) return;
        setAvailable(Boolean(info.isAvailable));
        if (info.biometryType) setBiometryLabel(String(info.biometryType));
      } catch (error) {
        console.error('[useBiometricAuth] indisponível:', error);
        if (active) setAvailable(false);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const authenticate = useCallback(
    async (reason = 'Confirme sua identidade para acessar o Arrow') => {
      if (!isNativeApp() || !available) return true;
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        await BiometricAuth.authenticate({
          reason,
          cancelTitle: 'Cancelar',
          allowDeviceCredential: true,
          androidTitle: 'Arrow',
          androidSubtitle: reason,
        } as any);

        return true;
      } catch (error) {
        console.warn('[useBiometricAuth] autenticação falhou/cancelada:', error);
        return false;
      }
    },
    [available]
  );

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (!user?.id) return false;
      if (value) {
        const ok = await authenticate('Confirme sua biometria para ativar o acesso rápido');
        if (!ok) {
          toast.error('Não foi possível validar sua biometria');
          return false;
        }
      }
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_login_enabled: value } as any)
        .eq('id', user.id);
      if (error) {
        toast.error('Não foi possível salvar a preferência');
        return false;
      }
      await refreshProfile?.();
      toast.success(value ? 'Acesso por biometria ativado' : 'Acesso por biometria desativado');
      return true;
    },
    [user?.id, authenticate, refreshProfile]
  );

  return { available, checking, enabled, biometryLabel, authenticate, setEnabled };
};
