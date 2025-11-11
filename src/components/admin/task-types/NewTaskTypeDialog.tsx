import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  tools: z.array(z.string()),
  steps: z.array(z.string()),
  photoLabels: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface NewTaskTypeDialogProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export const NewTaskTypeDialog = ({ onSubmit, onCancel }: NewTaskTypeDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [photoLabels, setPhotoLabels] = useState<string[]>([]);
  const [newPhotoLabel, setNewPhotoLabel] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
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

  const handleSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      form.reset();
      setTools([]);
      setSteps([]);
      setPhotoLabels([]);
      setCategoryInput("");
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categoryInput.toLowerCase())
  );

  const handleSelectCategory = (category: string, onChange: (value: string) => void) => {
    onChange(category);
    setCategoryInput(category);
    setShowDropdown(false);
  };

  const handleCreateCategory = (onChange: (value: string) => void) => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      const newCategory = categoryInput.trim();
      setCategories([...categories, newCategory]);
      onChange(newCategory);
      setShowDropdown(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none border-b pb-4">
        <DialogTitle>Novo Tipo de Tarefa</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-y-auto space-y-6 py-4">
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

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <div className="relative" ref={dropdownRef}>
                  <FormControl>
                    <div className="relative">
                      <Input
                        value={categoryInput}
                        onChange={(e) => {
                          setCategoryInput(e.target.value);
                          field.onChange(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Digite ou selecione uma categoria"
                        className="pr-8"
                      />
                      {categoryInput && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => {
                            setCategoryInput("");
                            field.onChange("");
                            setShowDropdown(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-auto">
                      {filteredCategories.length > 0 ? (
                        <div className="py-1">
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                            Categorias existentes
                          </div>
                          {filteredCategories.map((category) => (
                            <div
                              key={category}
                              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                              onClick={() => handleSelectCategory(category, field.onChange)}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  field.value === category ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {categoryInput.trim() && !categories.includes(categoryInput.trim()) && (
                        <div className="p-2 border-t">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mb-1">
                            Criar nova categoria
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => handleCreateCategory(field.onChange)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar "{categoryInput}"
                          </Button>
                        </div>
                      )}
                      {!categoryInput.trim() && filteredCategories.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          Digite para buscar ou criar uma categoria
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite um nome novo para criar uma categoria ou selecione uma existente
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Descreva o tipo de tarefa..."
                    rows={4}
                  />
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTool();
                  }
                }}
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
              <Button type="button" onClick={handleAddStep} size="icon" className="self-start mt-2">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPhotoLabel();
                  }
                }}
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

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Tipo de Tarefa"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
};
