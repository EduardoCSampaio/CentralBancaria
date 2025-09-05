"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileUpload: (data: any[][], headers: string[]) => void;
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (!file.type.includes('spreadsheetml') && !file.type.includes('xls') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      toast({
        variant: 'destructive',
        title: 'Formato de arquivo inválido',
        description: 'Por favor, envie um arquivo .xls ou .xlsx.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 1) {
          const headers = jsonData[0].map(h => String(h));
          onFileUpload(jsonData.slice(1), headers);
        } else {
           toast({
            variant: 'destructive',
            title: 'Arquivo inválido',
            description: 'A planilha selecionada está vazia ou contém apenas o cabeçalho.',
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao processar o arquivo',
          description: 'Não foi possível ler a planilha. Verifique o formato do arquivo.',
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <Card className={`transition-all duration-300 ${isDragging ? 'border-primary shadow-lg' : ''}`}>
      <CardContent className="p-0">
        <label
          htmlFor="file-upload"
          className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-primary/80"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-secondary p-4 text-secondary-foreground">
              <Upload className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                Arraste e solte seu arquivo aqui
              </p>
              <p className="text-sm text-muted-foreground">ou <span className="font-semibold text-primary">clique para selecionar</span></p>
            </div>
            <p className="text-xs text-muted-foreground">Suporta: .xls, .xlsx</p>
          </div>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            onChange={handleInputChange}
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
        </label>
      </CardContent>
    </Card>
  );
}
