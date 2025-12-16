import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ship, Anchor, Navigation } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useAccessPoints, translatePointType } from "@/hooks/useAccessPoints";

interface LocationAccessSectionProps {
  form: UseFormReturn<any>;
}

export function LocationAccessSection({ form }: LocationAccessSectionProps) {
  const { accessPoints, isLoading: loadingAccessPoints } = useAccessPoints();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Local de Atendimento e Acesso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Planned Location */}
        <FormField
          control={form.control}
          name="plannedLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local de Atendimento</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Porto de Santos, Baía de Guanabara, Bacia de Santos..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expected Context */}
          <FormField
            control={form.control}
            name="expectedContext"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situação Esperada do Navio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="docked">
                      <div className="flex items-center gap-2">
                        <Anchor className="h-4 w-4" />
                        Atracado no Porto
                      </div>
                    </SelectItem>
                    <SelectItem value="anchored">
                      <div className="flex items-center gap-2">
                        <Anchor className="h-4 w-4" />
                        Fundeado (na baía)
                      </div>
                    </SelectItem>
                    <SelectItem value="offshore">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        Offshore (plataforma/FPSO)
                      </div>
                    </SelectItem>
                    <SelectItem value="at_sea">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        Em Alto Mar
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Boarding Method */}
          <FormField
            control={form.control}
            name="boardingMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Embarque</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="gangway">Prancha / Escada</SelectItem>
                    <SelectItem value="launch">Lancha</SelectItem>
                    <SelectItem value="helicopter">Helicóptero</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Access Point Selection */}
        <FormField
          control={form.control}
          name="accessPointId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ponto de Acesso</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ponto de acesso" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Nenhum / Outro</SelectItem>
                  {loadingAccessPoints ? (
                    <SelectItem value="__loading__" disabled>Carregando...</SelectItem>
                  ) : (
                    accessPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {translatePointType(point.point_type)}
                          </Badge>
                          {point.name}
                          {point.location && (
                            <span className="text-muted-foreground text-xs">
                              - {point.location}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Access Instructions */}
        <FormField
          control={form.control}
          name="accessInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instruções de Acesso</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Apresentar-se no Portão 5, solicitar autorização com Sr. João, embarque às 08:00..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
