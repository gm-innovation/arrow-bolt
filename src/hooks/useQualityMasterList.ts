import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MasterListRow {
  kind: "document" | "process";
  id: string;
  code: string | null;
  title: string;
  type: string | null;
  version_label: string | null;
  owner_user_id: string | null;
  process_owner_user_id?: string | null;
  last_review_at: string | null;
  next_review_at: string | null;
  status: string;
}

export const useQualityMasterList = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["quality_master_list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: docs, error: e1 } = await supabase
        .from("quality_documents" as any)
        .select("id, code, title, classification, status, created_by, published_at, next_review_date, current_version_id")
        .eq("company_id", companyId!);
      if (e1) throw e1;

      const versionIds = (docs ?? []).map((d: any) => d.current_version_id).filter(Boolean);
      const versionMap = new Map<string, string>();
      if (versionIds.length) {
        const { data: vs } = await supabase
          .from("quality_document_versions" as any)
          .select("id, version")
          .in("id", versionIds);
        (vs ?? []).forEach((v: any) => versionMap.set(v.id, String(v.version)));
      }

      const { data: procs, error: e2 } = await supabase
        .from("quality_processes" as any)
        .select("id, name, type, owner_user_id, status, current_document_id")
        .eq("company_id", companyId!);
      if (e2) throw e2;

      const procDocIds = (procs ?? []).map((p: any) => p.current_document_id).filter(Boolean);
      const procDocsMap = new Map<string, any>();
      if (procDocIds.length) {
        const { data: pdocs } = await supabase
          .from("quality_documents" as any)
          .select("id, code, current_version_id, published_at, next_review_date, status, created_by")
          .in("id", procDocIds);
        (pdocs ?? []).forEach((d: any) => procDocsMap.set(d.id, d));
      }

      const docRows: MasterListRow[] = (docs ?? []).map((d: any) => ({
        kind: "document",
        id: d.id,
        code: d.code ?? null,
        title: d.title,
        type: d.classification ?? null,
        version_label: d.current_version_id ? versionMap.get(d.current_version_id) ?? null : null,
        owner_user_id: d.created_by ?? null,
        last_review_at: d.published_at ?? null,
        next_review_at: d.next_review_date ?? null,
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
          version_label: linked?.current_version_id ? versionMap.get(linked.current_version_id) ?? null : null,
          owner_user_id: linked?.created_by ?? null,
          process_owner_user_id: p.owner_user_id ?? null,
          last_review_at: linked?.published_at ?? null,
          next_review_at: linked?.next_review_date ?? null,
          status: p.status ?? "draft",
        };
      });

      return [...docRows, ...procRows].sort((a, b) =>
        ((a.code ?? a.title) as string).localeCompare((b.code ?? b.title) as string)
      );
    },
  });
};
