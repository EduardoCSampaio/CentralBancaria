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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

  const getAvailableFieldsForColumn = (currentHeader: string) => {
    const currentMapping = columnMappings[currentHeader];
    const mappedFields = Object.values(columnMappings);
    return REQUIRED_FIELDS.filter(
      field => !mappedFields.includes(field) || field === currentMapping
    );
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
      <Table className='min-w-max'>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header, index) => {
              const currentMapping = columnMappings[header];
              const availableFields = getAvailableFieldsForColumn(header);
              return (
                <TableHead key={index} className="min-w-[200px] whitespace-nowrap p-2 align-top">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-foreground truncate">{header}</span>
                    <Select
                      value={currentMapping || 'none'}
                      onValueChange={(value) => onColumnMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (ignorar)</SelectItem>
                        {currentMapping && !REQUIRED_FIELDS.includes(currentMapping) && (
                           <SelectItem value={currentMapping} disabled>
                              {currentMapping}
                           </SelectItem>
                        )}
                        {REQUIRED_FIELDS.map((field) => (
                           <SelectItem 
                              key={field} 
                              value={field}
                              disabled={Object.values(columnMappings).includes(field) && currentMapping !== field}
                           >
                            {FIELD_LABELS[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, colIndex) => {
                const cellContent = cell === null || cell === undefined ? '' : String(cell);
                return (
                  <TableCell key={colIndex} className="whitespace-nowrap transition-colors">
                      <span className="truncate">{cellContent}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
       <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
