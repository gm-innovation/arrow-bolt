import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface FinancePayable {
  id: string;
  company_id: string;
  supplier_name: string;
  description: string | null;
  category_id: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  payment_date: string | null;
  invoice_number: string | null;
  purchase_request_id: string | null;
  status: string;
  notes: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceReceivable {
  id: string;
  company_id: string;
  client_id: string | null;
  client_name: string;
  description: string | null;
  category_id: string | null;
  amount: number;
  received_amount: number;
  due_date: string;
  received_date: string | null;
  invoice_number: string | null;
  measurement_id: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceReimbursement {
  id: string;
  company_id: string;
  requester_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string | null;
  status: string;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  requester?: { full_name: string } | null;
}

export const useFinancePayables = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["finance-payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payables")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as FinancePayable[];
    },
    enabled: !!user,
  });

  const createPayable = useMutation({
    mutationFn: async (values: { supplier_name: string; description?: string; amount: number; due_date: string; invoice_number?: string; notes?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("finance_payables").insert({
        company_id: profile.company_id,
        supplier_name: values.supplier_name,
        description: values.description || null,
        amount: values.amount,
        due_date: values.due_date,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
        created_by: user!.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-payables"] });
      toast({ title: "Conta a pagar registrada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updatePayable = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: unknown }) => {
      if (values.status === "approved") {
        values.approved_by = user!.id;
        values.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("finance_payables").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-payables"] });
      toast({ title: "Atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return { payables, isLoading, createPayable, updatePayable };
};

export const useFinanceReceivables = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["finance-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_receivables")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as FinanceReceivable[];
    },
    enabled: !!user,
  });

  const createReceivable = useMutation({
    mutationFn: async (values: { client_name: string; description?: string; amount: number; due_date: string; invoice_number?: string; notes?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("finance_receivables").insert({
        company_id: profile.company_id,
        client_name: values.client_name,
        description: values.description || null,
        amount: values.amount,
        due_date: values.due_date,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
        created_by: user!.id,
        status: "invoiced",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-receivables"] });
      toast({ title: "Conta a receber registrada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateReceivable = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from("finance_receivables").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-receivables"] });
      toast({ title: "Atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return { receivables, isLoading, createReceivable, updateReceivable };
};

export const useFinanceReimbursements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reimbursements = [], isLoading } = useQuery({
    queryKey: ["finance-reimbursements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_reimbursements")
        .select("*, requester:profiles!finance_reimbursements_requester_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as FinanceReimbursement[];
    },
    enabled: !!user,
  });

  const createReimbursement = useMutation({
    mutationFn: async (values: { description: string; amount: number; expense_date: string; notes?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("finance_reimbursements").insert({
        company_id: profile.company_id,
        requester_id: user!.id,
        description: values.description,
        amount: values.amount,
        expense_date: values.expense_date,
        notes: values.notes || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-reimbursements"] });
      toast({ title: "Reembolso solicitado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateReimbursement = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; rejection_reason?: string; [key: string]: unknown }) => {
      if (values.status === "approved") {
        values.approved_by = user!.id;
        values.approved_at = new Date().toISOString();
      }
      if (values.status === "paid") {
        values.paid_at = new Date().toISOString();
      }
      const { error } = await supabase.from("finance_reimbursements").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-reimbursements"] });
      toast({ title: "Atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return { reimbursements, isLoading, createReimbursement, updateReimbursement };
};
