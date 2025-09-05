"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileUploader } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileCheck2, Loader2, Search, Sparkles, UploadCloud } from 'lucide-react';
import type { ValidateImportedDataInput, ValidateImportedDataOutput } from '@/ai/flows/validate-imported-data';
import { validateImportedData } from '@/ai/flows/validate-imported-data';
import { useToast } from '@/hooks/use-toast';
import { REQUIRED_FIELDS, FIELD_LABELS } from '@/lib/constants';
import { exportToCsv } from '@/lib/csv';
import { setValidatedData } from '@/lib/storage';

type AppState = "upload" | "mapping" | "validated";

export default function UploadPage() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [data, setData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<number, ValidateImportedDataOutput['validationResults']>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (uploadedData: any[][], uploadedHeaders: string[]) => {
    setData(uploadedData);
    setHeaders(uploadedHeaders);
    setValidationResults({});
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

  const handleValidate = async () => {
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
    const newValidationResults: Record<number, ValidateImportedDataOutput['validationResults']> = {};
    const validatedDataToStore: Record<string, any>[] = [];
    
    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const input: ValidateImportedDataInput = Object.fromEntries(
            REQUIRED_FIELDS.map(field => [field, ''])
        ) as ValidateImportedDataInput;
        
        const rowObjectForStorage: Record<string, any> = {};

        headers.forEach((header, index) => {
          const mappedField = columnMappings[header];
          if (mappedField) {
            const value = row[index] !== null && row[index] !== undefined ? String(row[index]) : '';
            input[mappedField as keyof ValidateImportedDataInput] = value;
            rowObjectForStorage[mappedField] = value;
          }
        });

        const result = await validateImportedData(input);
        newValidationResults[i] = result.validationResults;
        const hasErrors = result.validationResults.some(res => !res.isValid);
        if (!hasErrors) {
           validatedDataToStore.push(rowObjectForStorage);
        }
      }
      
      setValidatedData(validatedDataToStore);

      setValidationResults(newValidationResults);
      setAppState("validated");
      toast({
        title: 'Validação concluída!',
        description: 'Os dados foram validados pela IA. Verifique os resultados.',
        className: 'bg-accent/90 text-accent-foreground border-accent'
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na validação',
        description: 'Ocorreu um erro ao se comunicar com o serviço de IA.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExport = () => {
    const processedData = data.map((row, rowIndex) => {
        const rowObject: Record<string, any> = {};
        REQUIRED_FIELDS.forEach(field => {
            const headerIndex = headers.findIndex(h => columnMappings[h] === field);
            if (headerIndex !== -1) {
                rowObject[field] = row[headerIndex];
            } else {
                rowObject[field] = '';
            }
        });
        return rowObject;
    });

    exportToCsv(processedData, 'dados_validados.csv');
     toast({
      title: 'Exportação Iniciada',
      description: 'Seu arquivo CSV será baixado em breve.',
    });
  };

  const handleReset = () => {
    setAppState("upload");
    setData([]);
    setHeaders([]);
    setColumnMappings({});
    setValidationResults({});
  };

  const isMappingComplete = REQUIRED_FIELDS.length === Object.values(columnMappings).filter(Boolean).length;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col items-center text-center mb-8">
         <div className="flex items-center gap-2 mb-2">
            <FileCheck2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-primary">
                Excel Insights
            </h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Importe, valide com IA e exporte seus dados de planilha com facilidade e precisão.
        </p>
      </div>
      
      {appState === 'upload' && (
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UploadCloud /> Etapa 1: Enviar Planilha</CardTitle>
              <CardDescription>Comece enviando seu arquivo Excel (.xls ou .xlsx) para validação.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search />Consultar Cliente</CardTitle>
                <CardDescription>Busque por um cliente já validado usando o CPF.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                <p className="text-muted-foreground mb-4">Acesse a página de consulta para buscar clientes.</p>
                <Link href="/consulta" passHref>
                  <Button>
                    <Search className="mr-2" />
                    Ir para Consulta
                  </Button>
                </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {(appState === 'mapping' || appState === 'validated') && (
        <Card>
          <CardHeader>
             <CardTitle>Etapa 2: Mapear e Validar</CardTitle>
             <CardDescription>
                Associe cada coluna da sua planilha ao campo correto. Depois, clique em "Validar com IA" para verificar os dados.
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DataTable 
              headers={headers}
              data={data}
              columnMappings={columnMappings}
              onColumnMappingChange={handleColumnMappingChange}
              validationResults={validationResults}
            />
            <div className="flex flex-wrap gap-4 justify-end">
               <Button variant="outline" onClick={handleReset}>
                Enviar Novo Arquivo
               </Button>
               <Button onClick={handleValidate} disabled={isProcessing || !isMappingComplete}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Validar com IA
               </Button>
               <Button onClick={handleExport} disabled={appState !== 'validated'}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
               </Button>
            </div>
             {!isMappingComplete && (
                <p className="text-sm text-muted-foreground text-right">Mapeie todos os campos obrigatórios para habilitar a validação.</p>
             )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}