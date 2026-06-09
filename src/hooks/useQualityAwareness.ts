import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AwarenessEvent {
  id: string;
  company_id: string;
  topic: string;
  description: string | null;
  event_date: string;
  conducted_by: string | null;
  evidence_url: string | null;
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
      return (data ?? []) as unknown as AwarenessEvent[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      topic: string;
      description?: string;
      event_date?: string;
      evidence_url?: string;
      attendees: string[];
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
      return (data ?? []) as { user_id: string; acknowledged_at: string }[];
    },
  });
};
