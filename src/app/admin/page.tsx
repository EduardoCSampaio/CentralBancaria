"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileUploader } from '@/components/file-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Save, UploadCloud, KeyRound, ArrowLeft, Users, AreaChart, BarChart2, FileQuestion, CheckCircle, Search, CalendarCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { REQUIRED_FIELDS, FIELD_LABELS } from '@/lib/constants';
import { exportToCsv } from '@/lib/csv';
import { getValidatedData, setValidatedData, checkAndFixDates } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable } from '@/components/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { toast } = useToast();
  const [isFetchingStats, setIsFetchingStats] = useState(true);
  const [isCheckingDates, setIsCheckingDates] = useState(false);

  const calculateStats = (allData: any[]) => {
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
  
  const fetchAndSetStats = async () => {
    setIsFetchingStats(true);
    try {
      const allData = await getValidatedData();
      calculateStats(allData);
    } catch(e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar os dados do banco. Verifique sua conexão ou a configuração do Supabase.',
      });
    } finally {
        setIsFetchingStats(false);
    }
  }

  useEffect(() => {
    if(isAuthenticated) {
      fetchAndSetStats();
    }
  }, [isAuthenticated]);


  const handleLogin = () => {
    setIsLoggingIn(true);
    // Simula uma requisição de rede
    setTimeout(() => {
      // Em um app real, a senha deveria ser validada no backend
      // A senha 'admin' é um fallback, priorizando a variável de ambiente.
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin';
      if (password === adminPassword) {
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
      setIsLoggingIn(false);
    }, 500);
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
    const currencyFields = ['valor_beneficio', 'margem_disponivel', 'margem_rmc'];

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

             if (currencyFields.includes(mappedField)) {
                // Remove R$, espaços, e troca vírgula por ponto para salvar no BD
                value = value.replace(/R\$\s?/, '').replace(/\./g, '').replace(/,/, '.');
             }
             
             rowObject[mappedField] = value;
          }
        });
        // Add default values for any missing required fields
        REQUIRED_FIELDS.forEach(field => {
            if(!rowObject.hasOwnProperty(field)){
                rowObject[field] = '';
            }
        });
        return rowObject;
      });
      
      await setValidatedData(processedData);
      setAppState("processed");
      await fetchAndSetStats(); // Recalculate stats after saving new data

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
        description: 'Ocorreu um erro ao salvar os dados no banco de dados. Verifique o console para mais detalhes.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExport = async () => {
    try {
        const dataToExport = await getValidatedData();
        if(dataToExport.length === 0){
            toast({
                variant: 'destructive',
                title: 'Nenhum dado para exportar',
                description: 'A base de dados está vazia.',
            });
            return;
        }
        exportToCsv(dataToExport, 'backup_dados_bancarios.csv');
        toast({
            title: 'Exportação Iniciada',
            description: 'Seu arquivo de backup (CSV) será baixado em breve.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao exportar',
            description: 'Não foi possível carregar os dados para exportação.',
        });
    }
  };

  const handleCheckAndFixDates = async () => {
    setIsCheckingDates(true);
    try {
        const correctedCount = await checkAndFixDates();
        if (correctedCount > 0) {
            toast({
                title: 'Datas Corrigidas!',
                description: `${correctedCount} registro(s) de data de nascimento foram corrigidos com sucesso.`,
                 className: 'bg-accent/90 text-accent-foreground border-accent'
            });
        } else {
             toast({
                title: 'Nenhuma correção necessária',
                description: 'Todas as datas de nascimento no banco de dados já estão no formato correto.',
            });
        }
    } catch(e) {
        toast({
            variant: 'destructive',
            title: 'Erro ao verificar datas',
            description: 'Não foi possível completar a verificação. Tente novamente.',
        });
    } finally {
        setIsCheckingDates(false);
    }
  };

  const handleReset = () => {
    setAppState("upload");
    setData([]);
    setHeaders([]);
    setColumnMappings({});
  };

  const isMappingComplete = REQUIRED_FIELDS.every(f => Object.values(columnMappings).includes(f));

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
                            disabled={isLoggingIn}
                        />
                        <Button onClick={handleLogin} disabled={isLoggingIn}>
                            {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Entrar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-8">
                {isFetchingStats ? (
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card><CardHeader><CardTitle className='text-sm font-medium'>Carregando...</CardTitle></CardHeader><CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
                        <Card><CardHeader><CardTitle className='text-sm font-medium'>Carregando...</CardTitle></CardHeader><CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
                        <Card className="lg:col-span-2"><CardHeader><CardTitle className='text-sm font-medium'>Carregando...</CardTitle></CardHeader><CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
                    </div>
                ): stats && (
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
                                 <CardContent className='flex flex-wrap gap-2'>
                                    <Button variant="outline" onClick={handleReset} className='flex-1' disabled={appState === 'upload'}>
                                        <UploadCloud className="mr-2 h-4 w-4" /> Enviar Novo Arquivo
                                    </Button>
                                    <Button onClick={handleExport} className='flex-1' disabled={stats.totalClients === 0}>
                                        <Download className="mr-2 h-4 w-4" /> Fazer Backup (CSV)
                                    </Button>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                           <Button variant="secondary" className='flex-1' disabled={isCheckingDates || stats.totalClients === 0}>
                                                {isCheckingDates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
                                                Verificar Datas
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Verificação de Datas?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação irá varrer todo o banco de dados em busca de datas de nascimento em formato numérico (de planilha) e as converterá para o formato DD/MM/AAAA.
                                                Isso não afetará as datas que já estão corretas. Deseja continuar?
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCheckAndFixDates}>Sim, Verificar e Corrigir</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
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
                        { !isFetchingStats && stats?.totalClients === 0 ? 
                            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                <FileQuestion className="mx-auto h-12 w-12" />
                                <h3 className="mt-4 text-lg font-semibold">Base de dados vazia</h3>
                                <p className="mt-1">Nenhum cliente encontrado. Comece enviando uma planilha para popular o sistema.</p>
                                <div className='mt-6'>
                                     <FileUploader onFileUpload={handleFileUpload} />
                                </div>
                            </div>
                            :
                            <FileUploader onFileUpload={handleFileUpload} />
                        }
                        </CardContent>
                    </Card>
                )}

                {appState === 'mapping' && (
                    <Card>
                    <CardHeader>
                        <CardTitle>Etapa 2: Mapear e Processar</CardTitle>
                        <CardDescription>
                            Associe as colunas da sua planilha aos campos corretos. Depois, clique em "Processar e Salvar".
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="w-full overflow-x-auto">
                            <DataTable 
                            headers={headers}
                            data={data.slice(0, 5)}
                            columnMappings={columnMappings}
                            onColumnMappingChange={handleColumnMappingChange}
                            validationResults={null}
                            />
                        </div>
                        {data.length > 5 && (
                            <p className="text-center text-sm text-muted-foreground">Exibindo as primeiras 5 de {data.length} linhas.</p>
                        )}
                        <div className="flex flex-wrap gap-4 justify-end">
                            <Button variant="outline" onClick={handleReset}>
                                Cancelar
                            </Button>
                            <Button onClick={handleProcessAndSave} disabled={isProcessing || !isMappingComplete}>
                                {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Save className="mr-2 h-4 w-4" />
                                )}
                                Processar e Salvar {data.length} linhas
                            </Button>
                        </div>
                        {!isMappingComplete && (
                            <p className="text-sm text-muted-foreground text-right">Mapeie todos os campos obrigatórios para habilitar o processamento.</p>
                        )}
                    </CardContent>
                    </Card>
                )}

                 {appState === 'processed' && (
                     <Card className="text-center">
                        <CardHeader>
                            <CardTitle className='flex items-center justify-center gap-2'><CheckCircle className='text-green-500'/> Processamento Concluído</CardTitle>
                            <CardDescription>Os dados foram salvos com sucesso no banco de dados.</CardDescription>
                        </Header>
                        <CardContent className='flex flex-col sm:flex-row gap-4 justify-center'>
                           <Button onClick={handleReset} className='w-full sm:w-auto'>
                                <UploadCloud className="mr-2 h-4 w-4" /> Enviar Novo Arquivo
                            </Button>
                            <Button onClick={handleExport} className='w-full sm:w-auto' variant="outline">
                                <Download className="mr-2 h-4 w-4" /> Fazer Backup (CSV)
                            </Button>
                             <Link href="/" passHref className='w-full sm:w-auto'>
                                <Button variant="secondary" className='w-full'>
                                    <Search className="mr-2 h-4 w-4" /> Ir para Consulta
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                 )}
            </div>
        )}
      </div>
    </main>
  );
}
