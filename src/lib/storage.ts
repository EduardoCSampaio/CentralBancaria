import { supabase } from './supabase';

const TABLE_NAME = 'clients';

// Armazena os dados validados no Supabase
export async function setValidatedData(data: Record<string, any>[]) {
  if (data.length === 0) return;

  // O 'upsert' do Supabase insere novos registros ou atualiza os existentes
  // se houver um conflito na coluna 'cpf'. Isso evita duplicatas.
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(data, { onConflict: 'cpf' });

  if (error) {
    console.error("Erro ao salvar dados no Supabase:", error);
    throw error; // Propaga o erro para ser tratado na UI
  }
}

// Recupera os dados validados do Supabase
export async function getValidatedData(): Promise<Record<string, any>[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select('*');
  
  if (error) {
    console.error("Erro ao ler dados do Supabase:", error);
    return [];
  }

  return data || [];
}
