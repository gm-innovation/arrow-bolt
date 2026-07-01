import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ExternalAttendee {
  name: string;
  company?: string;
  email?: string;
}

export interface AwarenessEvent {
  id: string;
  company_id: string;
  topic: string;
  description: string | null;
  event_date: string;
  conducted_by: string | null;
  evidence_url: string | null;
  external_attendees: ExternalAttendee[];
  created_at: string;
  updated_at: string;
}

export const useQualityAwarenessEvents = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_awareness_events", profile?.company_id];

  const { data: events = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_awareness_events" as any)
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        external_attendees: Array.isArray(r.external_attendees) ? r.external_attendees : [],
      })) as AwarenessEvent[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      topic: string;
      description?: string;
      event_date?: string;
      evidence_url?: string;
      attendees: string[];
      external_attendees?: ExternalAttendee[];
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data: ev, error } = await supabase
        .from("quality_awareness_events" as any)
        .insert({
          company_id: profile.company_id,
          topic: input.topic,
          description: input.description || null,
          event_date: input.event_date || new Date().toISOString().slice(0, 10),
          conducted_by: user?.id ?? null,
          evidence_url: input.evidence_url || null,
          external_attendees: input.external_attendees ?? [],
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (input.attendees.length) {
        const { error: aerr } = await supabase
          .from("quality_awareness_attendees" as any)
          .insert(input.attendees.map((uid) => ({ event_id: (ev as any).id, user_id: uid })) as any);
        if (aerr) throw aerr;
      }
      return ev;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Evento registrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_awareness_events" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { events, isLoading, create, remove };
};

export const useAwarenessAttendees = (eventId?: string | null) => {
  return useQuery({
    queryKey: ["quality_awareness_attendees", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_awareness_attendees" as any)
        .select("user_id, acknowledged_at")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as { user_id: string; acknowledged_at: string | null }[];
    },
  });
};

export const useMyAwarenessEvents = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["my_quality_awareness", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_awareness_attendees" as any)
        .select("event_id, acknowledged_at, event:quality_awareness_events(id, topic, description, event_date)")
        .eq("user_id", user!.id)
        .order("acknowledged_at", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("quality_awareness_attendees" as any)
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Ciência registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, acknowledge };
};
