import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  tools: z.array(z.string()),
  steps: z.array(z.string()),
  photoLabels: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

export const NewTaskTypeDialog = () => {
  const { toast } = useToast();
  const [tools, setTools] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [photoLabels, setPhotoLabels] = useState<string[]>([]);
  const [newPhotoLabel, setNewPhotoLabel] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tools: [],
      steps: [],
      photoLabels: [],
    },
  });

  const handleAddTool = () => {
    if (newTool.trim()) {
      setTools([...tools, newTool.trim()]);
      form.setValue("tools", [...tools, newTool.trim()]);
      setNewTool("");
    }
  };

  const handleRemoveTool = (index: number) => {
    const updatedTools = tools.filter((_, i) => i !== index);
    setTools(updatedTools);
    form.setValue("tools", updatedTools);
  };

  const handleAddStep = () => {
    if (newStep.trim()) {
      setSteps([...steps, newStep.trim()]);
      form.setValue("steps", [...steps, newStep.trim()]);
      setNewStep("");
    }
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    setSteps(updatedSteps);
    form.setValue("steps", updatedSteps);
  };

  const handleAddPhotoLabel = () => {
    if (newPhotoLabel.trim()) {
      setPhotoLabels([...photoLabels, newPhotoLabel.trim()]);
      form.setValue("photoLabels", [...photoLabels, newPhotoLabel.trim()]);
      setNewPhotoLabel("");
    }
  };

  const handleRemovePhotoLabel = (index: number) => {
    const updatedLabels = photoLabels.filter((_, i) => i !== index);
    setPhotoLabels(updatedLabels);
    form.setValue("photoLabels", updatedLabels);
  };

  const onSubmit = (data: FormData) => {
    console.log("Form submitted:", data);
    toast({
      title: "Tipo de tarefa criado",
      description: "O novo tipo de tarefa foi criado com sucesso.",
    });
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none border-b pb-4">
        <DialogTitle>Novo Tipo de Tarefa</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Tarefa</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Digite o nome da tarefa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormLabel>Checklist de Ferramentas e Equipamentos</FormLabel>
            <div className="flex gap-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                placeholder="Adicionar ferramenta ou equipamento"
              />
              <Button type="button" onClick={handleAddTool} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded-md">
                  <span className="flex-1">{tool}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTool(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <FormLabel>Passo a Passo</FormLabel>
            <div className="flex gap-2">
              <Textarea
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Adicionar passo"
              />
              <Button type="button" onClick={handleAddStep} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded-md">
                  <span className="flex-1">{step}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <FormLabel>Legendas das Fotos</FormLabel>
            <div className="flex gap-2">
              <Input
                value={newPhotoLabel}
                onChange={(e) => setNewPhotoLabel(e.target.value)}
                placeholder="Adicionar legenda para foto"
              />
              <Button type="button" onClick={handleAddPhotoLabel} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {photoLabels.map((label, index) => (
                <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded-md">
                  <span className="flex-1">{label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePhotoLabel(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit">Criar Tipo de Tarefa</Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};