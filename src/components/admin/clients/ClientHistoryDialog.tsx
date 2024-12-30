import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Ship, Calendar } from "lucide-react";
import { format } from "date-fns";

type ClientHistoryEntry = {
  id: string;
  date: Date;
  type: "service" | "vessel";
  description: string;
  vesselName?: string;
};

// Mock data - replace with real data when integrating with backend
const mockHistory: Record<string, ClientHistoryEntry[]> = {
  "1": [
    {
      id: "1",
      date: new Date("2024-03-15"),
      type: "service",
      description: "Manutenção preventiva realizada",
      vesselName: "PB-001",
    },
    {
      id: "2",
      date: new Date("2024-03-10"),
      type: "vessel",
      description: "Nova embarcação adicionada",
      vesselName: "PB-002",
    },
  ],
  "2": [
    {
      id: "3",
      date: new Date("2024-03-12"),
      type: "service",
      description: "Inspeção técnica completada",
      vesselName: "SH-001",
    },
  ],
};

interface ClientHistoryDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientHistoryDialog = ({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ClientHistoryDialogProps) => {
  const history = mockHistory[clientId] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico - {clientName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50"
              >
                {entry.type === "service" ? (
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Ship className="h-4 w-4 text-blue-600" />
                  </div>
                ) : (
                  <div className="bg-green-100 p-2 rounded-full">
                    <Ship className="h-4 w-4 text-green-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{entry.description}</p>
                  {entry.vesselName && (
                    <p className="text-sm text-muted-foreground">
                      Embarcação: {entry.vesselName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(entry.date, "dd/MM/yyyy")}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};