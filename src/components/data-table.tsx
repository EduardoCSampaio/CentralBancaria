"use client";

import type { ValidateImportedDataOutput } from '@/ai/flows/validate-imported-data';
import { FIELD_LABELS, REQUIRED_FIELDS } from '@/lib/constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  headers: string[];
  data: any[][];
  columnMappings: Record<string, string>;
  onColumnMappingChange: (header: string, field: string) => void;
  validationResults: Record<number, ValidateImportedDataOutput['validationResults']> | null;
}

export function DataTable({
  headers,
  data,
  columnMappings,
  onColumnMappingChange,
  validationResults,
}: DataTableProps) {
  
  const getValidationStatus = (rowIndex: number, colIndex: number) => {
    if (!validationResults || !validationResults[rowIndex]) return null;

    const originalHeader = headers[colIndex];
    const mappedField = columnMappings[originalHeader];
    if (!mappedField) return null;

    const validation = validationResults[rowIndex].find(
      (res) => res.field.toLowerCase() === mappedField.toLowerCase()
    );

    if (!validation) return null;
    return validation;
  };

  const availableFields = REQUIRED_FIELDS.filter(
    field => !Object.values(columnMappings).includes(field)
  );

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {headers.map((header, index) => (
                <TableHead key={index} className="min-w-[200px] whitespace-nowrap p-2 align-top">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-foreground">{header}</span>
                    <Select
                      value={columnMappings[header] || ''}
                      onValueChange={(value) => onColumnMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {columnMappings[header] && <SelectItem value={columnMappings[header]!}>{FIELD_LABELS[columnMappings[header]!]}</SelectItem>}
                        {availableFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {FIELD_LABELS[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const validation = getValidationStatus(rowIndex, colIndex);
                  const cellContent = cell === null || cell === undefined ? '' : String(cell);
                  
                  return (
                    <TableCell key={colIndex} className={cn("whitespace-nowrap transition-colors", {
                      "bg-destructive/10 text-destructive-foreground": validation && !validation.isValid,
                      "bg-accent/20": validation && validation.isValid,
                    })}>
                      {validation ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              {validation.isValid ? (
                                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                              )}
                              <span className="truncate">{cellContent}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{validation.isValid ? 'Validado' : `Erro: ${validation.errorMessage}`}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="truncate">{cellContent}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
