import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ship, Anchor, Navigation, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { useAccessPoints, translatePointType } from "@/hooks/useAccessPoints";
import { useVesselPosition, translateLocationContext, translateNavigationStatus } from "@/hooks/useVesselPosition";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationAccessSectionProps {
  form: UseFormReturn<any>;
  vesselId: string | null;
}

export function LocationAccessSection({ form, vesselId }: LocationAccessSectionProps) {
  const { accessPoints, isLoading: loadingAccessPoints } = useAccessPoints();
  const { position, isLoading: loadingPosition, source, refresh } = useVesselPosition(vesselId);

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'port': return <Anchor className="h-4 w-4" />;
      case 'bay': return <Anchor className="h-4 w-4" />;
      case 'offshore': return <Ship className="h-4 w-4" />;
      case 'at_sea': return <Navigation className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'port': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'bay': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'offshore': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'at_sea': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Local de Atendimento e Acesso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AIS Position Info (Read-only) */}
        {vesselId && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Posição AIS Atual</span>
                <Badge variant="outline" className="text-xs">
                  {source === 'ais' ? 'Tempo Real' : source === 'database' ? 'Última Conhecida' : 'Indisponível'}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loadingPosition}
              >
                <RefreshCw className={`h-4 w-4 ${loadingPosition ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {loadingPosition ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : position ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <div className="flex items-center gap-1">
                    {getContextIcon(position.location_context)}
                    <span>{translateLocationContext(position.location_context)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Nav. Status</p>
                  <p>{translateNavigationStatus(position.navigation_status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Velocidade</p>
                  <p>{position.speed_over_ground?.toFixed(1) || '0'} nós</p>
                </div>
                {position.destination && (
                  <div>
                    <p className="text-muted-foreground text-xs">Destino</p>
                    <p className="truncate">{position.destination}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Posição AIS não disponível para este navio</span>
              </div>
            )}
          </div>
        )}

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
