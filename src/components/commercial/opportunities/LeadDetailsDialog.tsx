import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Building2, Sparkles } from "lucide-react";
import type { Lead } from "./ConvertLeadDialog";

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Novo",
  reviewed: "Em contato",
  converted: "Convertido",
  discarded: "Descartado",
};

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConvert?: (lead: Lead) => void;
  onStatusChange?: (id: string, status: Lead["status"]) => void;
}

export const LeadDetailsDialog = ({ lead, open, onOpenChange, onConvert, onStatusChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead?.company_name || lead?.name || "Lead"}</DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {lead.name && lead.company_name && (
                <div className="flex items-center gap-2 col-span-2 text-muted-foreground">
                  Contato: <span className="text-foreground">{lead.name}</span>
                </div>
              )}
              {lead.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{lead.email}</div>}
              {lead.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{lead.phone}</div>}
              {lead.company_name && <div className="flex items-center gap-2 col-span-2"><Building2 className="w-4 h-4" />{lead.company_name}</div>}
            </div>
            {lead.message && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
                <div className="p-3 bg-muted rounded whitespace-pre-wrap">{lead.message}</div>
              </div>
            )}
            {lead.items?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Itens de interesse</div>
                <div className="border rounded divide-y">
                  {lead.items.map((it, idx) => (
                    <div key={idx} className="p-2 flex justify-between text-sm">
                      <span>{it.name}{it.notes && <span className="text-muted-foreground"> — {it.notes}</span>}</span>
                      {it.qty != null && <span className="font-mono">{it.qty}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select
                value={lead.status}
                onValueChange={(v) => onStatusChange?.(lead.id, v as Lead["status"])}
                disabled={lead.status === "converted" || !onStatusChange}
              >
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lead.status !== "converted" && onConvert && (
                <Button variant="default" size="sm" className="ml-auto" onClick={() => { onConvert(lead); onOpenChange(false); }}>
                  <Sparkles className="w-4 h-4 mr-1" /> Converter
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
