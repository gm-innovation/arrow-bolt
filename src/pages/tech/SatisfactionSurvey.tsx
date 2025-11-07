import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SatisfactionSurvey = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState("");
  const [signature, setSignature] = useState("");
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const { data } = await supabase
        .from("tasks")
        .select(`
          *,
          service_order:service_orders(
            id,
            order_number,
            client:clients(name)
          )
        `)
        .eq("id", taskId)
        .single();

      setTask(data);
    } catch (error) {
      console.error("Error fetching task:", error);
    }
  };

  const handleSubmit = async () => {
    if (!taskId || !signature || rating === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update task report with satisfaction data
      const { error } = await supabase
        .from("task_reports")
        .update({
          report_data: {
            satisfaction: {
              rating,
              comments,
              signature,
              submittedAt: new Date().toISOString(),
            },
          },
        })
        .eq("task_id", taskId);

      if (error) throw error;

      toast({
        title: "Pesquisa enviada",
        description: "Obrigado pelo seu feedback!",
      });
      navigate("/tech/tasks");
    } catch (error) {
      console.error("Error submitting survey:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar pesquisa de satisfação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Pesquisa de Satisfação
      </h2>

      {task && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>OS:</strong> {task.service_order?.order_number}</p>
              <p><strong>Cliente:</strong> {task.service_order?.client?.name}</p>
              <p><strong>Tarefa:</strong> {task.title}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Avaliação do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="font-medium">Comentários</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Deixe seus comentários ou sugestões..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura Digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium">Nome do Cliente</label>
            <Input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Digite seu nome completo"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Data: {new Date().toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!signature || rating === 0 || loading}
        >
          {loading ? "Enviando..." : "Enviar Pesquisa"}
        </Button>
      </div>
    </div>
  );
};

export default SatisfactionSurvey;