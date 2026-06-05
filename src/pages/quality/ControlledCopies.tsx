import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, RotateCcw, Trash2 } from "lucide-react";
import { useQualityControlledCopies, ControlledCopyStatus } from "@/hooks/useQualityControlledCopies";
import { format, parseISO } from "date-fns";

const statusLabel: Record<ControlledCopyStatus, string> = {
  issued: "Emitida",
  returned: "Recolhida",
  destroyed: "Inutilizada",
  lost: "Extraviada",
  superseded: "Substituída",
};

const ControlledCopies = () => {
  const navigate = useNavigate();
  const { copies, updateStatus, isLoading } = useQualityControlledCopies();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Printer className="h-6 w-6" /> Cópias Controladas
        </h2>
        <p className="text-muted-foreground">
          Visão consolidada das cópias impressas emitidas, recolhidas e inutilizadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as cópias</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">Carregando...</p>
          ) : copies.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhuma cópia registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Emitida em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {copies.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="link"
                        className="px-0"
                        onClick={() => navigate(`/quality/documents/${c.document_id}`)}
                      >
                        <span className="font-mono mr-2">{c.document?.code}</span> {c.document?.title}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono">{c.copy_number}</TableCell>
                    <TableCell>{c.recipient?.full_name || c.recipient_name || "—"}</TableCell>
                    <TableCell>{c.recipient_location || "—"}</TableCell>
                    <TableCell>{format(parseISO(c.issued_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "issued" ? "default" : "secondary"}>
                        {statusLabel[c.status as ControlledCopyStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "issued" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "returned" })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Recolher
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus.mutate({ id: c.id, status: "destroyed" })}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlledCopies;
