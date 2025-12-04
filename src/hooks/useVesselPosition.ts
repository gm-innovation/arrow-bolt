import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VesselPosition {
  latitude: number;
  longitude: number;
  speed_over_ground: number;
  course_over_ground: number;
  heading: number;
  navigation_status: number;
  destination: string;
  location_context: string;
  recorded_at: string;
}

interface UseVesselPositionResult {
  position: VesselPosition | null;
  isLoading: boolean;
  error: string | null;
  source: 'ais' | 'database' | 'none';
  refresh: () => Promise<void>;
}

export function useVesselPosition(vesselId: string | null): UseVesselPositionResult {
  const [position, setPosition] = useState<VesselPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'ais' | 'database' | 'none'>('none');

  const fetchPosition = useCallback(async () => {
    if (!vesselId) {
      setPosition(null);
      setSource('none');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ais-vessel-position', {
        body: { vessel_id: vesselId }
      });

      if (fnError) throw fnError;

      if (data?.position) {
        setPosition(data.position);
        setSource(data.source || 'database');
      } else {
        setPosition(null);
        setSource('none');
      }
    } catch (err: any) {
      console.error('Error fetching vessel position:', err);
      setError(err.message || 'Erro ao obter posição do navio');
      setSource('none');
    } finally {
      setIsLoading(false);
    }
  }, [vesselId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    position,
    isLoading,
    error,
    source,
    refresh: fetchPosition
  };
}

// Hook for geofence validation
interface GeofenceCheckResult {
  canCheckIn: boolean;
  canCheckOut: boolean;
  distanceToVessel: number | null;
  technicianContext: string;
  vesselContext: string | null;
  isOnMainland: boolean | null;
  nearestAccessPoint: {
    id: string;
    name: string;
    distance: number;
  } | null;
  warnings: string[];
}

interface UseGeofenceCheckResult {
  result: GeofenceCheckResult | null;
  isChecking: boolean;
  error: string | null;
  checkGeofence: (lat: number, lng: number) => Promise<GeofenceCheckResult | null>;
}

export function useGeofenceCheck(
  vesselId: string | null,
  serviceOrderId: string | null
): UseGeofenceCheckResult {
  const [result, setResult] = useState<GeofenceCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGeofence = useCallback(async (lat: number, lng: number): Promise<GeofenceCheckResult | null> => {
    setIsChecking(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('geofence-check', {
        body: {
          technician_latitude: lat,
          technician_longitude: lng,
          vessel_id: vesselId,
          service_order_id: serviceOrderId
        }
      });

      if (fnError) throw fnError;

      setResult(data);
      return data;
    } catch (err: any) {
      console.error('Error checking geofence:', err);
      setError(err.message || 'Erro ao verificar localização');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [vesselId, serviceOrderId]);

  return {
    result,
    isChecking,
    error,
    checkGeofence
  };
}

// Translate navigation status to Portuguese
export function translateNavigationStatus(status: number): string {
  const statuses: Record<number, string> = {
    0: 'Navegando',
    1: 'Fundeado',
    2: 'Sem comando',
    3: 'Manobra restrita',
    4: 'Restrição de calado',
    5: 'Atracado',
    6: 'Encalhado',
    7: 'Pescando',
    8: 'Navegando à vela'
  };
  return statuses[status] || 'Desconhecido';
}

// Translate location context to Portuguese
export function translateLocationContext(context: string): string {
  const contexts: Record<string, string> = {
    'port': 'No Porto',
    'bay': 'Na Baía',
    'offshore': 'Offshore',
    'at_sea': 'Em Alto Mar',
    'unknown': 'Desconhecido'
  };
  return contexts[context] || context;
}
