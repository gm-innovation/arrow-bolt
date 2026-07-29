import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/platform';

export interface NativeDeviceInfo {
  platform: string;
  model?: string;
  osVersion?: string;
  manufacturer?: string;
  appVersion?: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

/** Informações do aparelho e nível de bateria (usado nos registros de campo). */
export const useDeviceInfo = () => {
  const [info, setInfo] = useState<NativeDeviceInfo>({ platform: 'web' });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isNativeApp()) return;
      try {
        const { Device } = await import('@capacitor/device');
        const { App } = await import('@capacitor/app');
        const [device, battery, app] = await Promise.all([
          Device.getInfo(),
          Device.getBatteryInfo(),
          App.getInfo().catch(() => null),
        ]);
        if (!active) return;
        setInfo({
          platform: device.platform,
          model: device.model,
          osVersion: device.osVersion,
          manufacturer: device.manufacturer,
          appVersion: app?.version,
          batteryLevel:
            typeof battery.batteryLevel === 'number'
              ? Math.round(battery.batteryLevel * 100)
              : undefined,
          isCharging: battery.isCharging,
        });
      } catch (error) {
        console.error('[useDeviceInfo] erro:', error);
      }
    })();
    return () => { active = false; };
  }, []);

  return info;
};
