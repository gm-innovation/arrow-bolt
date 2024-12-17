import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Send } from "lucide-react";

const ReportForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [description, setDescription] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [checklist, setChecklist] = useState([
    { id: 1, label: "Verificação inicial realizada", checked: false },
    { id: 2, label: "Equipamentos necessários utilizados", checked: false },
    { id: 3, label: "Procedimentos de segurança seguidos", checked: false },
    { id: 4, label: "Testes finais executados", checked: false },
  ]);

  const handleSaveDraft = () => {
    toast({
      title: "Rascunho salvo",
      description: "O relatório foi salvo como rascunho.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Relatório enviado",
      description: "O relatório foi enviado para aprovação.",
    });
    navigate("/tech/reports");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {reportId ? "Editar Relatório" : "Novo Relatório"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium">Descrição do Serviço Realizado</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhadamente o serviço realizado..."
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium">Horas Trabalhadas</label>
              <Input
                type="number"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`check-${item.id}`}
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      setChecklist(
                        checklist.map((i) =>
                          i.id === item.id ? { ...i, checked: !!checked } : i
                        )
                      );
                    }}
                  />
                  <label
                    htmlFor={`check-${item.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button type="submit">
            <Send className="h-4 w-4 mr-2" />
            Enviar para Aprovação
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;