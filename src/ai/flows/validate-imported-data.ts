'use server';

/**
 * @fileOverview This file defines a Genkit flow for validating data imported from an Excel file.
 *
 * The flow uses an AI prompt to assess the imported data against expected datatypes and formats.
 * It identifies fields that require user attention due to inconsistencies or errors.
 *
 * @fileOverview
 * - validateImportedData - A function that validates data imported from an Excel file.
 * - ValidateImportedDataInput - The input type for the validateImportedData function.
 * - ValidateImportedDataOutput - The return type for the validateImportedData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateImportedDataInputSchema = z.object({
  cpf: z.string().describe('CPF (Cadastro de Pessoas Físicas) - Brazilian individual taxpayer registry identification.'),
  beneficio: z.string().describe('Benefit number.'),
  nome: z.string().describe('Name of the person.'),
  valor_beneficio: z.string().describe('Benefit value.'),
  data_nascimento: z.string().describe('Date of birth.'),
  idade: z.string().describe('Age.'),
  codigo_especie: z.string().describe('Kind code.'),
  margem_disponivel: z.string().describe('Available margin.'),
  margem_rmc: z.string().describe('RMC margin (Consigned Credit Margin).'),
  telefone: z.string().describe('Telephone number.'),
});

export type ValidateImportedDataInput = z.infer<typeof ValidateImportedDataInputSchema>;

const ValidateImportedDataOutputSchema = z.object({
  validationResults: z.array(
    z.object({
      field: z.string().describe('The name of the field being validated.'),
      isValid: z.boolean().describe('Indicates whether the field is valid according to the expected datatype and format.'),
      errorMessage: z.string().optional().describe('An error message if the field is not valid.'),
    })
  ).describe('An array of validation results for each field.'),
});

export type ValidateImportedDataOutput = z.infer<typeof ValidateImportedDataOutputSchema>;

export async function validateImportedData(input: ValidateImportedDataInput): Promise<ValidateImportedDataOutput> {
  return validateImportedDataFlow(input);
}

const validateImportedDataPrompt = ai.definePrompt({
  name: 'validateImportedDataPrompt',
  input: {schema: ValidateImportedDataInputSchema},
  output: {schema: ValidateImportedDataOutputSchema},
  prompt: `You are an expert data validator.

  You are given data from an Excel file with the following fields and descriptions:

  - CPF: Brazilian individual taxpayer registry identification. Should be a valid 11-digit number.
  - BENEFICIO: Benefit number. Should be a string of digits.
  - NOME: Name of the person. Should be a valid name.
  - VALOR_BENEFICIO: Benefit value. Should be a valid monetary value.
  - DATA_NASCIMENTO: Date of birth. Should be a valid date.
  - IDADE: Age. Should be a valid integer representing age.
  - CODIGO_ESPECIE: Kind code. Should be a string of digits.
  - MARGEM_DISPONIVEL: Available margin. Should be a valid monetary value.
  - MARGEM_RMC: RMC margin (Consigned Credit Margin). Should be a valid monetary value.
  - TELEFONE: Telephone number. Should be a valid phone number.

  For each field, determine if the data is valid according to its description. Return an array of validation results, including whether the field is valid and an error message if it is not.

  Data to validate:
  CPF: {{{cpf}}}
  BENEFICIO: {{{beneficio}}}
  NOME: {{{nome}}}
  VALOR_BENEFICIO: {{{valor_beneficio}}}
  DATA_NASCIMENTO: {{{data_nascimento}}}
  IDADE: {{{idade}}}
  CODIGO_ESPECIE: {{{codigo_especie}}}
  MARGEM_DISPONIVEL: {{{margem_disponivel}}}
  MARGEM_RMC: {{{margem_rmc}}}
  TELEFONE: {{{telefone}}}
  `,
});

const validateImportedDataFlow = ai.defineFlow(
  {
    name: 'validateImportedDataFlow',
    inputSchema: ValidateImportedDataInputSchema,
    outputSchema: ValidateImportedDataOutputSchema,
  },
  async input => {
    const {output} = await validateImportedDataPrompt(input);
    return output!;
  }
);
