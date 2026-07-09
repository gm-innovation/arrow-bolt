import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalDate } from "@/lib/utils";

interface SaleDetailDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const SaleDetailDialog = ({ saleId, open, onOpenChange }: SaleDetailDialogProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["crm-sale-detail", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const [saleRes, itemsRes] = await Promise.all([
        supabase
          .from("crm_sales")
          .select("*, clients(name), crm_opportunities(title)")
          .eq("id", saleId)
          .maybeSingle(),
        supabase
          .from("crm_sale_items")
          .select("*")
          .eq("sale_id", saleId)
          .order("created_at"),
      ]);
      if (saleRes.error) throw saleRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return { sale: saleRes.data, items: itemsRes.data || [] };
    },
    enabled: !!saleId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda {data?.sale?.sale_number ? `— ${data.sale.sale_number}` : ""}</DialogTitle>
          <DialogDescription>
            Informações completas da venda, itens e vínculo com oportunidade.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data?.sale ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{data.sale.clients?.name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oportunidade</p>
                <p className="font-medium">{data.sale.crm_opportunities?.title || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="secondary">{data.sale.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">
                  {data.sale.created_at ? formatLocalDate(data.sale.created_at) : "-"}
                </p>
              </div>
            </div>

            {data.sale.notes && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Observações</p>
                <p className="whitespace-pre-wrap">{data.sale.notes}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Itens</h3>
              {data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem itens registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Markup</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.name}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(it.unit_value))}</TableCell>
                        <TableCell className="text-right">{Number(it.markup_percentage || 0)}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(it.total_value))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total da Venda</p>
                <p className="text-2xl font-bold">{formatCurrency(Number(data.sale.total_amount))}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailDialog;
