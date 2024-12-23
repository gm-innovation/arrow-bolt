import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type TimeEntry = {
  id: string;
  date: Date;
  type: "work_normal" | "work_extra" | "travel_normal" | "travel_extra" | "wait_normal" | "wait_extra";
  startTime: string;
  endTime: string;
};

type TaskReport = {
  modelInfo: string;
  brandInfo: string;
  serialNumber: string;
  reportedIssue: string;
  executedWork: string;
  result: string;
  nextVisitWork: string;
  suppliedMaterial: string;
  photos: File[];
  timeEntries: TimeEntry[];
};

const ReportForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [selectedTask, setSelectedTask] = useState("task1");
  const [taskReports, setTaskReports] = useState<Record<string, TaskReport>>({
    task1: {
      modelInfo: "",
      brandInfo: "",
      serialNumber: "",
      reportedIssue: "",
      executedWork: "",
      result: "",
      nextVisitWork: "",
      suppliedMaterial: "",
      photos: [],
      timeEntries: [],
    },
  });

  const timeTypes = [
    { value: "work_normal", label: "Trabalho HN" },
    { value: "work_extra", label: "Trabalho HE" },
    { value: "travel_normal", label: "Viagem HN" },
    { value: "travel_extra", label: "Viagem HE" },
    { value: "wait_normal", label: "Espera HN" },
    { value: "wait_extra", label: "Espera HE" },
  ];

  const handleAddTimeEntry = (taskId: string) => {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      date: new Date(),
      type: "work_normal",
      startTime: "",
      endTime: "",
    };

    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: [...prev[taskId].timeEntries, newEntry],
      },
    }));
  };

  const handleRemoveTimeEntry = (taskId: string, entryId: string) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: prev[taskId].timeEntries.filter((entry) => entry.id !== entryId),
      },
    }));
  };

  const handleUpdateTimeEntry = (
    taskId: string,
    entryId: string,
    field: keyof TimeEntry,
    value: any
  ) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: prev[taskId].timeEntries.map((entry) =>
          entry.id === entryId ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  const handlePhotoUpload = (taskId: string, files: FileList | null) => {
    if (!files) return;

    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        photos: [...prev[taskId].photos, ...Array.from(files)],
      },
    }));
  };

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
        <Tabs value={selectedTask} onValueChange={setSelectedTask}>
          <TabsList>
            {Object.keys(taskReports).map((taskId) => (
              <TabsTrigger key={taskId} value={taskId}>
                Tarefa {taskId.replace("task", "")}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(taskReports).map(([taskId, report]) => (
            <TabsContent key={taskId} value={taskId} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Equipamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`model-${taskId}`}>Modelo</Label>
                      <Input
                        id={`model-${taskId}`}
                        value={report.modelInfo}
                        onChange={(e) =>
                          setTaskReports((prev) => ({
                            ...prev,
                            [taskId]: { ...prev[taskId], modelInfo: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`brand-${taskId}`}>Marca</Label>
                      <Input
                        id={`brand-${taskId}`}
                        value={report.brandInfo}
                        onChange={(e) =>
                          setTaskReports((prev) => ({
                            ...prev,
                            [taskId]: { ...prev[taskId], brandInfo: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`serial-${taskId}`}>Número de Série</Label>
                      <Input
                        id={`serial-${taskId}`}
                        value={report.serialNumber}
                        onChange={(e) =>
                          setTaskReports((prev) => ({
                            ...prev,
                            [taskId]: { ...prev[taskId], serialNumber: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`issue-${taskId}`}>Defeito Encontrado / Reportado</Label>
                    <Textarea
                      id={`issue-${taskId}`}
                      value={report.reportedIssue}
                      onChange={(e) =>
                        setTaskReports((prev) => ({
                          ...prev,
                          [taskId]: { ...prev[taskId], reportedIssue: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`work-${taskId}`}>Trabalhos Executados</Label>
                    <Textarea
                      id={`work-${taskId}`}
                      value={report.executedWork}
                      onChange={(e) =>
                        setTaskReports((prev) => ({
                          ...prev,
                          [taskId]: { ...prev[taskId], executedWork: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`result-${taskId}`}>Resultado</Label>
                    <Textarea
                      id={`result-${taskId}`}
                      value={report.result}
                      onChange={(e) =>
                        setTaskReports((prev) => ({
                          ...prev,
                          [taskId]: { ...prev[taskId], result: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`next-${taskId}`}>Trabalho para o Próximo Atendimento</Label>
                    <Textarea
                      id={`next-${taskId}`}
                      value={report.nextVisitWork}
                      onChange={(e) =>
                        setTaskReports((prev) => ({
                          ...prev,
                          [taskId]: { ...prev[taskId], nextVisitWork: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`material-${taskId}`}>Material Fornecido</Label>
                    <Textarea
                      id={`material-${taskId}`}
                      value={report.suppliedMaterial}
                      onChange={(e) =>
                        setTaskReports((prev) => ({
                          ...prev,
                          [taskId]: { ...prev[taskId], suppliedMaterial: e.target.value },
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fotos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(taskId, e.target.files)}
                  />
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {report.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Horários</CardTitle>
                  <Button type="button" variant="outline" onClick={() => handleAddTimeEntry(taskId)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Horário
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.timeEntries.map((entry) => (
                      <div key={entry.id} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-auto">
                          <Label>Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full md:w-[240px]">
                                {entry.date ? format(entry.date, "dd/MM/yyyy") : "Selecione uma data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={entry.date}
                                onSelect={(date) =>
                                  handleUpdateTimeEntry(taskId, entry.id, "date", date)
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="w-full md:w-auto">
                          <Label>Tipo</Label>
                          <Select
                            value={entry.type}
                            onValueChange={(value) =>
                              handleUpdateTimeEntry(taskId, entry.id, "type", value)
                            }
                          >
                            <SelectTrigger className="w-full md:w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full md:w-auto">
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={entry.startTime}
                            onChange={(e) =>
                              handleUpdateTimeEntry(taskId, entry.id, "startTime", e.target.value)
                            }
                          />
                        </div>

                        <div className="w-full md:w-auto">
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={entry.endTime}
                            onChange={(e) =>
                              handleUpdateTimeEntry(taskId, entry.id, "endTime", e.target.value)
                            }
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemoveTimeEntry(taskId, entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

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