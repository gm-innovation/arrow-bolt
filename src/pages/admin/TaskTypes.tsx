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
import { Plus, Eye, Edit, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { NewTaskTypeDialog } from "@/components/admin/task-types/NewTaskTypeDialog";
import { ViewTaskTypeDialog } from "@/components/admin/task-types/ViewTaskTypeDialog";
import { EditTaskTypeDialog } from "@/components/admin/task-types/EditTaskTypeDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TaskType {
  id: string;
  name: string;
  category?: string;
  description?: string;
  tools?: string[];
  steps?: string[];
  photo_labels?: string[];
  is_recurrent?: boolean;
  recurrence_type?: string;
  pricing_type?: string;
  default_periodicity?: number;
  default_estimated_value?: number;
}

const TaskTypes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingTaskType, setViewingTaskType] = useState<TaskType | null>(null);
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null);

  useEffect(() => {
    fetchTaskTypes();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from("task_categories")
        .select("name")
        .eq("company_id", profileData.company_id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data?.map(c => c.name) || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
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

      // Create category if it doesn't exist
      if (data.category?.trim()) {
        const { error: categoryError } = await supabase
          .from("task_categories")
          .upsert(
            { 
              name: data.category.trim(), 
              company_id: profileData.company_id 
            },
            { 
              onConflict: 'name,company_id',
              ignoreDuplicates: true 
            }
          );

        if (categoryError && categoryError.code !== '23505') {
          console.error("Error creating category:", categoryError);
        }
      }

      const { error } = await supabase.from("task_types").insert({
        name: data.name,
        category: data.category?.trim() || null,
        description: data.description,
        tools: data.tools || [],
        steps: data.steps || [],
        photo_labels: data.photoLabels || [],
        company_id: profileData.company_id,
        is_recurrent: data.is_recurrent || false,
        recurrence_type: data.recurrence_type || null,
        pricing_type: data.pricing_type || null,
        default_periodicity: data.default_periodicity || null,
        default_estimated_value: data.default_estimated_value || null,
      });

      if (error) throw error;

      setCreateOpen(false);
      fetchTaskTypes();
      fetchCategories();
      
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

  const filteredTaskTypes = taskTypes.filter((taskType) => {
    const matchesName = !taskName || taskName === "" || taskType.name.toLowerCase().includes(taskName.toLowerCase());
    const matchesCategory = category === "all" || taskType.category === category;
    return matchesName && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Tipos de Tarefas</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo de Tarefa
            </Button>
          </DialogTrigger>
          <NewTaskTypeDialog 
            onSubmit={handleCreateTaskType}
            onCancel={() => setCreateOpen(false)}
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
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
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
                  <TableHead className="text-center">Ferramentas</TableHead>
                  <TableHead className="text-center">Passos</TableHead>
                  <TableHead className="text-center">Legendas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaskTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo de tarefa encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTaskTypes.map((taskType) => (
                    <TableRow key={taskType.id}>
                      <TableCell>{taskType.name}</TableCell>
                      <TableCell>{taskType.category || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {taskType.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {taskType.tools?.length || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {taskType.steps?.length || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {taskType.photo_labels?.length || 0}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingTaskType(taskType)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTaskType(taskType)}
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

      {/* View Dialog */}
      <Dialog open={!!viewingTaskType} onOpenChange={(open) => !open && setViewingTaskType(null)}>
        <ViewTaskTypeDialog taskType={viewingTaskType} />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTaskType} onOpenChange={(open) => !open && setEditingTaskType(null)}>
        <EditTaskTypeDialog
          taskType={editingTaskType}
          onSuccess={() => {
            setEditingTaskType(null);
            fetchTaskTypes();
          }}
          onCancel={() => setEditingTaskType(null)}
        />
      </Dialog>
    </div>
  );
};

export default TaskTypes;
