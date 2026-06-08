import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MasterListRow {
  kind: "document" | "process";
  id: string;
  code: string | null;
  title: string;
  type: string | null;
  version: number | string | null;
  owner_user_id: string | null;
  process_owner_user_id?: string | null;
  last_review_at: string | null;
  next_review_at: string | null;
  status: string;
  approval_status?: string | null;
}

export const useQualityMasterList = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["quality_master_list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // 1. Documentos
      const { data: docs, error: e1 } = await supabase
        .from("quality_documents" as any)
        .select("id, code, title, document_type, current_version, owner_user_id, last_review_at, next_review_at, status")
        .eq("company_id", companyId!);
      if (e1) throw e1;

      // 2. Processos com documento atual
      const { data: procs, error: e2 } = await supabase
        .from("quality_processes" as any)
        .select("id, name, type, owner_user_id, status, current_document_id")
        .eq("company_id", companyId!);
      if (e2) throw e2;

      const procDocIds = (procs ?? []).map((p: any) => p.current_document_id).filter(Boolean);
      let procDocsMap = new Map<string, any>();
      if (procDocIds.length) {
        const { data: pdocs, error: e3 } = await supabase
          .from("quality_documents" as any)
          .select("id, code, current_version, last_review_at, next_review_at, status")
          .in("id", procDocIds);
        if (e3) throw e3;
        (pdocs ?? []).forEach((d: any) => procDocsMap.set(d.id, d));
      }

      const docRows: MasterListRow[] = (docs ?? []).map((d: any) => ({
        kind: "document",
        id: d.id,
        code: d.code ?? null,
        title: d.title,
        type: d.document_type ?? null,
        version: d.current_version ?? null,
        owner_user_id: d.owner_user_id ?? null,
        last_review_at: d.last_review_at ?? null,
        next_review_at: d.next_review_at ?? null,
        status: d.status ?? "draft",
      }));

      const procRows: MasterListRow[] = (procs ?? []).map((p: any) => {
        const linked = p.current_document_id ? procDocsMap.get(p.current_document_id) : null;
        return {
          kind: "process",
          id: p.id,
          code: linked?.code ?? null,
          title: p.name,
          type: p.type ?? null,
          version: linked?.current_version ?? null,
          owner_user_id: linked?.owner_user_id ?? null,
          process_owner_user_id: p.owner_user_id ?? null,
          last_review_at: linked?.last_review_at ?? null,
          next_review_at: linked?.next_review_at ?? null,
          status: p.status ?? "draft",
        };
      });

      return [...docRows, ...procRows].sort((a, b) => (a.code ?? a.title).localeCompare(b.code ?? b.title));
    },
  });
};
