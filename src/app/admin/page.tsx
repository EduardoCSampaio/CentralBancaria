"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileUploader } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Save, UploadCloud, KeyRound, ArrowLeft, Users, AreaChart, BarChart2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { REQUIRED_FIELDS, FIELD_LABELS } from '@/lib/constants';
import { exportToCsv } from '@/lib/csv';
import { getValidatedData, setValidatedData } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type AppState = "upload" | "mapping" | "processed";

interface DashboardStats {
  totalClients: number;
  averageAge: number;
  ageDistribution: { range: string; count: number }[];
}

export default function AdminPage() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [data, setData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { toast } = useToast();

  const calculateStats = () => {
    const allData = getValidatedData();
    if (allData.length === 0) {
      setStats({ totalClients: 0, averageAge: 0, ageDistribution: [] });
      return;
    }
    const totalClients = allData.length;
    const totalAge = allData.reduce((acc, client) => acc + (parseInt(client.idade, 10) || 0), 0);
    const averageAge = totalClients > 0 ? Math.round(totalAge / totalClients) : 0;

    const ageDistribution = allData.reduce((acc, client) => {
      const age = parseInt(client.idade, 10);
      if (isNaN(age)) return acc;
      const range = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
      const existingRange = acc.find(item => item.range === range);
      if (existingRange) {
        existingRange.count++;
      } else {
        acc.push({ range, count: 1 });
      }
      return acc;
    }, [] as { range: string; count: number }[]).sort((a, b) => {
        const aStart = parseInt(a.range.split('-')[0]);
        const bStart = parseInt(b.range.split('-')[0]);
        return aStart - bStart;
    });

    setStats({ totalClients, averageAge, ageDistribution });
  };
  
  useEffect(() => {
    if(isAuthenticated) {
      calculateStats();
    }
  }, [isAuthenticated]);


  const handleLogin = () => {
    if (password === 'admin') {
      setIsAuthenticated(true);
      toast({
        title: 'Autenticado com sucesso!',
        description: 'Bem-vindo ao Painel Admin.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Senha incorreta',
        description: 'Por favor, tente novamente.',
      });
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
          handleLogin();
      }
  };

  const handleFileUpload = (uploadedData: any[][], uploadedHeaders: string[]) => {
    setData(uploadedData);
    setHeaders(uploadedHeaders);
    setAppState("mapping");

    // Automatic mapping
    const newMappings: Record<string, string> = {};
    const unmappedFields = [...REQUIRED_FIELDS];

    uploadedHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[\s_]+/g, '');
      const fieldKeys = Object.keys(FIELD_LABELS);
      const matchedField = fieldKeys.find(field => {
        const normalizedLabel = FIELD_LABELS[field].toLowerCase().replace(/[\s_]+/g, '');
        const normalizedField = field.toLowerCase().replace(/[\s_]+/g, '');
        return normalizedLabel === normalizedHeader || normalizedField === normalizedHeader;
      });

      if (matchedField && unmappedFields.includes(matchedField)) {
        newMappings[header] = matchedField;
        unmappedFields.splice(unmappedFields.indexOf(matchedField), 1);
      }
    });

    setColumnMappings(newMappings);
    
    toast({
      title: 'Arquivo carregado',
      description: 'As colunas foram mapeadas automaticamente. Verifique e prossiga.',
    });
  };

  const handleColumnMappingChange = (header: string, field: string) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev };
      // un-assign if another column has this field
      for (const key in newMappings) {
        if (newMappings[key] === field) {
          delete newMappings[key];
        }
      }
      if (field && field !== 'none') {
        newMappings[header] = field;
      } else {
        delete newMappings[header];
      }
      return newMappings;
    });
  };

  const handleProcessAndSave = async () => {
    const mappedFields = Object.values(columnMappings);
    const missingFields = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f));

    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Mapeamento incompleto',
        description: `Por favor, mapeie os seguintes campos: ${missingFields.map(f => FIELD_LABELS[f]).join(', ')}`,
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const processedData = data.map(row => {
        const rowObject: Record<string, any> = {};
        headers.forEach((header, index) => {
          const mappedField = columnMappings[header];
          if (mappedField) {
             let value = row[index] !== null && row[index] !== undefined ? String(row[index]) : '';
             if (mappedField === 'cpf') {
                 value = value.padStart(11, '0');
             }
             rowObject[mappedField] = value;
          }
        });
        return rowObject;
      });
      
      setValidatedData(processedData);
      setAppState("processed");
      calculateStats(); // Recalculate stats after saving new data

      toast({
        title: 'Processamento concluído!',
        description: 'Os dados foram processados e salvos. O dashboard foi atualizado.',
        className: 'bg-accent/90 text-accent-foreground border-accent'
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro no processamento',
        description: 'Ocorreu um erro ao processar os dados.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExport = () => {
    const dataToExport = getValidatedData();
    if(dataToExport.length === 0){
        toast({
            variant: 'destructive',
            title: 'Nenhum dado para exportar',
            description: 'Processe um arquivo primeiro.',
        });
        return;
    }
    exportToCsv(dataToExport, 'backup_dados.csv');
     toast({
      title: 'Exportação Iniciada',
      description: 'Seu arquivo de backup (CSV) será baixado em breve.',
    });
  };

  const handleReset = () => {
    setAppState("upload");
    setData([]);
    setHeaders([]);
    setColumnMappings({});
  };

  const isMappingComplete = REQUIRED_FIELDS.length === Object.values(columnMappings).filter(Boolean).length;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Painel Admin</h1>
          <p className="text-muted-foreground">
            Gerencie, analise e exporte os dados da sua aplicação.
          </p>
        </div>
      </div>

       <div className="mx-auto max-w-6xl">
        {!isAuthenticated ? (
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> Acesso Restrito</CardTitle>
                    <CardDescription>Por favor, insira a senha para acessar o painel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            type="password"
                            placeholder="Digite a senha..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button onClick={handleLogin}>Entrar</Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-8">
                {stats && (
                    <section>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><AreaChart /> Dashboard</h2>
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                             <Card>
                                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                     <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                                     <Users className="h-4 w-4 text-muted-foreground" />
                                 </CardHeader>
                                 <CardContent>
                                     <div className="text-2xl font-bold">{stats.totalClients}</div>
                                     <p className="text-xs text-muted-foreground">Clientes na base de dados</p>
                                 </CardContent>
                             </Card>
                             <Card>
                                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                     <CardTitle className="text-sm font-medium">Idade Média</CardTitle>
                                     <Users className="h-4 w-4 text-muted-foreground" />
                                 </CardHeader>
                                 <CardContent>
                                     <div className="text-2xl font-bold">{stats.averageAge} anos</div>
                                     <p className="text-xs text-muted-foreground">Média de idade dos clientes</p>
                                 </CardContent>
                             </Card>
                              <Card className="lg:col-span-2">
                                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                     <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
                                 </CardHeader>
                                 <CardContent className='flex gap-2'>
                                    <Button variant="outline" onClick={handleReset} className='w-full'>
                                        <UploadCloud className="mr-2 h-4 w-4" /> Enviar Novo Arquivo
                                    </Button>
                                    <Button onClick={handleExport} className='w-full'>
                                        <Download className="mr-2 h-4 w-4" /> Fazer Backup (CSV)
                                    </Button>
                                 </CardContent>
                             </Card>
                         </div>
                         {stats.ageDistribution.length > 0 && (
                            <Card className='mt-4'>
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'><BarChart2/> Distribuição por Idade</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{
                                        count: { label: 'Clientes', color: 'hsl(var(--primary))' },
                                    }} className="h-[250px] w-full">
                                        <BarChart data={stats.ageDistribution} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} />
                                            <YAxis />
                                            <Tooltip
                                                cursor={false}
                                                content={<ChartTooltipContent
                                                    labelFormatter={(value, payload) => `Faixa: ${payload[0]?.payload.range}`}
                                                />}
                                            />
                                            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                         )}
                    </section>
                )}
                
                {appState === 'upload' && (
                     <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UploadCloud /> Etapa 1: Enviar Planilha</CardTitle>
                        <CardDescription>Comece enviando seu arquivo Excel (.xls ou .xlsx) para processamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <FileUploader onFileUpload={handleFileUpload} />
                        </CardContent>
                    </Card>
                )}

                {(appState === 'mapping' || appState === 'processed') && (
                    <Card>
                    <CardHeader>
                        <CardTitle>Etapa 2: Mapear e Processar</CardTitle>
                        <CardDescription>
                            {appState === 'mapping' ? 'Associe as colunas da sua planilha aos campos corretos. Depois, clique em "Processar e Salvar".' : 'Dados processados com sucesso! Você pode enviar um novo arquivo ou exportar os dados.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <DataTable 
                        headers={headers}
                        data={data}
                        columnMappings={columnMappings}
                        onColumnMappingChange={handleColumnMappingChange}
                        validationResults={null}
                        />
                        <div className="flex flex-wrap gap-4 justify-end">
                        <Button variant="outline" onClick={handleReset}>
                            {appState === 'processed' ? 'Enviar Novo Arquivo' : 'Cancelar'}
                        </Button>
                        {appState === 'mapping' && (
                            <Button onClick={handleProcessAndSave} disabled={isProcessing || !isMappingComplete}>
                                {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Save className="mr-2 h-4 w-4" />
                                )}
                                Processar e Salvar
                            </Button>
                        )}
                        <Button onClick={handleExport} disabled={stats?.totalClients === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Fazer Backup (CSV)
                        </Button>
                        </div>
                        {appState === 'mapping' && !isMappingComplete && (
                            <p className="text-sm text-muted-foreground text-right">Mapeie todos os campos obrigatórios para habilitar o processamento.</p>
                        )}
                    </CardContent>
                    </Card>
                )}
            </div>
        )}
      </div>
    </main>
  );
}
