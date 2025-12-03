import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TechnicianLocation {
  id: string;
  technician_id: string;
  task_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  location_type: 'check_in' | 'check_out' | 'tracking';
  address: string | null;
  recorded_at: string;
}

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });
  const [technicianId, setTechnicianId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicianId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) setTechnicianId(data.id);
    };

    fetchTechnicianId();
  }, [user?.id]);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const recordLocation = useCallback(async (
    locationType: 'check_in' | 'check_out' | 'tracking',
    taskId?: string
  ) => {
    if (!technicianId) {
      toast({
        title: 'Erro',
        description: 'Técnico não encontrado',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      setState(prev => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        loading: false,
      }));

      // Try to get address from coordinates using reverse geocoding
      let address: string | null = null;
      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        if (mapboxToken) {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&limit=1`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            address = data.features[0].place_name;
          }
        }
      } catch (e) {
        console.warn('Failed to get address:', e);
      }

      const { data, error } = await supabase
        .from('technician_locations')
        .insert({
          technician_id: technicianId,
          task_id: taskId || null,
          latitude,
          longitude,
          accuracy,
          location_type: locationType,
          address,
        })
        .select()
        .single();

      if (error) throw error;

      const actionText = locationType === 'check_in' ? 'Check-in' : 
                        locationType === 'check_out' ? 'Check-out' : 'Localização';

      toast({
        title: `${actionText} registrado`,
        description: address || `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
      });

      return data as TechnicianLocation;
    } catch (error: any) {
      const errorMessage = error.code === 1 ? 'Permissão de localização negada' :
                          error.code === 2 ? 'Posição indisponível' :
                          error.code === 3 ? 'Tempo esgotado' :
                          error.message;

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));

      toast({
        title: 'Erro ao registrar localização',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  }, [technicianId, getCurrentPosition, toast]);

  const checkIn = useCallback((taskId?: string) => {
    return recordLocation('check_in', taskId);
  }, [recordLocation]);

  const checkOut = useCallback((taskId?: string) => {
    return recordLocation('check_out', taskId);
  }, [recordLocation]);

  const trackLocation = useCallback((taskId?: string) => {
    return recordLocation('tracking', taskId);
  }, [recordLocation]);

  return {
    ...state,
    checkIn,
    checkOut,
    trackLocation,
    technicianId,
  };
}

export function useTechnicianLocations(technicianId?: string, dateRange?: { from: Date; to: Date }) {
  const { toast } = useToast();
  const [locations, setLocations] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    if (!technicianId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('technician_locations')
        .select('*')
        .eq('technician_id', technicianId)
        .order('recorded_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('recorded_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('recorded_at', dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setLocations((data as TechnicianLocation[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar localizações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [technicianId, dateRange, toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    refetch: fetchLocations,
  };
}

export function useAllTechnicianLocations(companyId?: string) {
  const { toast } = useToast();
  const [locations, setLocations] = useState<(TechnicianLocation & { technician?: { profiles?: { full_name: string } } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get latest location for each technician
      const { data, error } = await supabase
        .from('technician_locations')
        .select(`
          *,
          technician:technician_id(
            id,
            profiles:user_id(full_name)
          )
        `)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      // Group by technician and get only the latest
      const latestByTechnician = new Map();
      for (const loc of data || []) {
        if (!latestByTechnician.has(loc.technician_id)) {
          latestByTechnician.set(loc.technician_id, loc);
        }
      }

      setLocations(Array.from(latestByTechnician.values()));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar localizações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    refetch: fetchLocations,
  };
}
