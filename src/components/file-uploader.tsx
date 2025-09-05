"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileUpload: (data: any[][], headers: string[]) => void;
}

// Função para converter número de série de data do Excel para o formato DD/MM/AAAA
function excelSerialDateToJSDate(serial: number) {
  if (typeof serial !== 'number' || isNaN(serial)) {
    return null;
  }
  // A data base do Excel é 31/12/1899, mas há um bug histórico que considera 1900 como ano bissexto.
  // A conversão correta subtrai 25569 (dias entre 01/01/1970 e 01/01/1900) e ajusta o fuso horário.
  const utc_days = Math.floor(serial - 25569);
  const date_info = new Date(utc_days * 86400 * 1000);

  const day = String(date_info.getUTCDate()).padStart(2, '0');
  const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
  const year = date_info.getUTCFullYear();
  
  if (year < 1900 || year > 2100) return null; // Validação básica

  return `${day}/${month}/${year}`;
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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Usamos { raw: false } para obter os valores formatados como strings
        // Isso ajuda com datas, mas elas podem vir em formatos diferentes.
        // O { header: 1 } transforma tudo em um array de arrays.
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        // Agora, uma segunda passada com raw: true para pegar os números das datas
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

        if (jsonData.length > 1) {
          const headers = jsonData[0].map(h => String(h));
          const processedData = jsonData.slice(1).map((row, rowIndex) => {
            return row.map((cell, colIndex) => {
              const rawCell = rawData[rowIndex + 1]?.[colIndex];

              // Se a célula bruta for um número e parece ser uma data do Excel, converta.
              if (typeof rawCell === 'number' && rawCell > 20000 && rawCell < 80000) {
                 const formattedDate = excelSerialDateToJSDate(rawCell);
                 if (formattedDate) return formattedDate;
              }
              
              // Se for uma data JS (por causa de cellDates: true), formate-a
              if (cell instanceof Date) {
                  return cell.toLocaleDateString('pt-BR');
              }

              return cell;
            });
          });

          onFileUpload(processedData, headers);
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
