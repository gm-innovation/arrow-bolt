import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Edit } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { NewTaskTypeDialog } from "@/components/admin/task-types/NewTaskTypeDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TaskTypes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState("all-categories");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchTaskTypes();
  }, []);

  const fetchTaskTypes = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from("task_types")
        .select("*")
        .eq("company_id", profileData.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTaskTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tipos de tarefas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskType = async (data: any) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) throw new Error("Company not found");

      const { error } = await supabase.from("task_types").insert({
        name: data.name,
        category: data.category,
        description: data.description,
        company_id: profileData.company_id,
      });

      if (error) throw error;

      setOpen(false);
      fetchTaskTypes();
      
      toast({
        title: "Tipo de tarefa criado",
        description: "O novo tipo de tarefa foi criado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar tipo de tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = (taskTypeId: string) => {
    toast({
      title: "Visualizar histórico",
      description: `Visualizando histórico do tipo de tarefa ${taskTypeId}`,
    });
  };

  const handleEdit = (taskTypeId: string) => {
    toast({
      title: "Editar tipo de tarefa",
      description: `Editando tipo de tarefa ${taskTypeId}`,
    });
  };

  const filteredTaskTypes = taskTypes.filter((taskType) => {
    const matchesName = !taskName || taskType.name.toLowerCase().includes(taskName.toLowerCase());
    const matchesCategory = !category || category === "all-categories" || taskType.category === category;
    return matchesName && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Tipos de Tarefas</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo de Tarefa
            </Button>
          </DialogTrigger>
          <NewTaskTypeDialog 
            onSubmit={handleCreateTaskType}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label>Nome da Tarefa</label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Buscar por nome..."
              />
            </div>
            <div className="space-y-2">
              <label>Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="Refrigeração">Refrigeração</SelectItem>
                  <SelectItem value="Eletrônica">Eletrônica</SelectItem>
                  <SelectItem value="Mecânica">Mecânica</SelectItem>
                  <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                  <SelectItem value="Elétrica">Elétrica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando tipos de tarefas...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Total de Tarefas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaskTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo de tarefa encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTaskTypes.map((taskType) => (
                    <TableRow key={taskType.id}>
                      <TableCell>{taskType.name}</TableCell>
                      <TableCell>{taskType.category}</TableCell>
                      <TableCell>{taskType.description || "-"}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewHistory(taskType.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(taskType.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskTypes;
