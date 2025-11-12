import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceRatesTab } from "@/components/admin/settings/ServiceRatesTab";
import { GeneralSettingsTab } from "@/components/admin/settings/GeneralSettingsTab";
import { CityDistancesTab } from "@/components/admin/settings/CityDistancesTab";

const MeasurementSettings = () => {
  const [activeTab, setActiveTab] = useState("rates");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações de Medição</h1>
        <p className="text-muted-foreground">
          Configure taxas de serviço, parâmetros gerais e distâncias entre cidades
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rates">Taxas de Serviço (HH)</TabsTrigger>
          <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="distances">Distâncias</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxas de Serviço por Hora</CardTitle>
              <CardDescription>
                Configure os valores de mão de obra por função, tipo de hora e categoria de trabalho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceRatesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure taxas de deslocamento, markup padrão e impostos por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distâncias entre Cidades</CardTitle>
              <CardDescription>
                Cadastre as distâncias entre cidades para cálculo automático de deslocamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CityDistancesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeasurementSettings;
