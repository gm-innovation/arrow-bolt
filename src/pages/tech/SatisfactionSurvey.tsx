import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad, SignaturePadRef } from "@/components/ui/SignaturePad";

const SatisfactionSurvey = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState("");
  const [clientName, setClientName] = useState("");
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

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

  const handleSignatureEnd = () => {
    setHasSignature(!signaturePadRef.current?.isEmpty());
  };

  const handleSubmit = async () => {
    if (!taskId || !clientName || rating === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome e a avaliação",
        variant: "destructive",
      });
      return;
    }

    if (signaturePadRef.current?.isEmpty()) {
      toast({
        title: "Assinatura obrigatória",
        description: "Por favor, assine no campo de assinatura",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get signature as base64
      const signatureImage = signaturePadRef.current?.toDataURL() || "";

      // First, fetch existing report data to merge
      const { data: existingReport } = await supabase
        .from("task_reports")
        .select("report_data")
        .eq("task_id", taskId)
        .single();

      // Merge satisfaction data with existing report_data
      const existingData = (existingReport?.report_data && typeof existingReport.report_data === 'object') 
        ? existingReport.report_data as Record<string, unknown>
        : {};
      const updatedReportData = {
        ...existingData,
        satisfaction: {
          rating,
          comments,
          clientName,
          signatureImage,
          submittedAt: new Date().toISOString(),
        },
      };

      // Update task report with merged data
      const { error } = await supabase
        .from("task_reports")
        .update({
          report_data: updatedReportData,
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
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {rating === 1 && "Muito insatisfeito"}
              {rating === 2 && "Insatisfeito"}
              {rating === 3 && "Neutro"}
              {rating === 4 && "Satisfeito"}
              {rating === 5 && "Muito satisfeito"}
            </p>
          )}
          <div className="space-y-2">
            <Label>Comentários (opcional)</Label>
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
            <Label htmlFor="clientName">Nome do Cliente *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Digite o nome completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Assinatura *</Label>
            <p className="text-sm text-muted-foreground">
              Desenhe sua assinatura no campo abaixo
            </p>
            <SignaturePad
              ref={signaturePadRef}
              onEnd={handleSignatureEnd}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Data: {new Date().toLocaleDateString("pt-BR")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!clientName || rating === 0 || loading}
          size="lg"
        >
          {loading ? "Enviando..." : "Enviar Pesquisa"}
        </Button>
      </div>
    </div>
  );
};

export default SatisfactionSurvey;
