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
  // Por padrão, o Supabase limita as queries a 1000 registros.
  // Para buscar todos os dados, precisamos paginar os resultados.
  const BATCH_SIZE = 1000;
  let allData: Record<string, any>[] = [];
  let offset = 0;
  let hasMore = true;

  while(hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error("Erro ao ler dados do Supabase:", error);
      // Retorna os dados que conseguiu buscar até o momento do erro.
      return allData;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      offset += BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
