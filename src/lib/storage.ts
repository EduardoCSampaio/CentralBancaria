import { supabase } from './supabase';

const TABLE_NAME = 'clients';

// Função para converter número de série de data do Excel para o formato DD/MM/AAAA
// É importante ter essa função aqui para ser usada na correção.
function excelSerialDateToJSDate(serial: number) {
  if (typeof serial !== 'number' || isNaN(serial) || serial < 1) {
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
  // Por padrão, o Supabase limita as queries.
  // Para buscar todos os dados, precisamos paginar os resultados.
  const BATCH_SIZE = 1000;
  let allData: Record<string, any>[] = [];
  let offset = 0;
  let hasMore = true;

  while(hasMore) {
    const { data, error, count } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error("Erro ao ler dados do Supabase:", error);
      // Retorna os dados que conseguiu buscar até o momento do erro.
      return allData;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      offset += data.length;
    } 
    
    if (!data || data.length < BATCH_SIZE || allData.length === count) {
      hasMore = false;
    }
  }

  return allData;
}


// Função para verificar e corrigir as datas no banco de dados
export async function checkAndFixDates(): Promise<number> {
    const allData = await getValidatedData();
    const recordsToUpdate: Record<string, any>[] = [];

    for (const client of allData) {
        const dob = client.data_nascimento;
        // Verifica se a data de nascimento é um número (provavelmente um serial do Excel)
        if (dob && !isNaN(Number(dob)) && !String(dob).includes('/')) {
            const numericDob = Number(dob);
            // Validação para evitar converter outros números que não sejam datas
            if(numericDob > 1 && numericDob < 100000) {
                 const formattedDate = excelSerialDateToJSDate(numericDob);
                 if (formattedDate) {
                    recordsToUpdate.push({
                        ...client,
                        data_nascimento: formattedDate,
                    });
                 }
            }
        }
    }

    if (recordsToUpdate.length > 0) {
        // Usa o upsert para atualizar apenas os registros que precisam de correção
        const { error } = await supabase
            .from(TABLE_NAME)
            .upsert(recordsToUpdate, { onConflict: 'cpf' });

        if (error) {
            console.error("Erro ao atualizar as datas:", error);
            throw error;
        }
    }

    return recordsToUpdate.length;
}

// Função para verificar e corrigir valores monetários no banco de dados
export async function checkAndFixMargins(): Promise<number> {
    const allData = await getValidatedData();
    const recordsToUpdate: Record<string, any>[] = [];
    const currencyFields = ['valor_beneficio', 'margem_disponivel', 'margem_rmc'];

    for (const client of allData) {
        let needsUpdate = false;
        const updatedClient = { ...client };

        for (const field of currencyFields) {
            const value = client[field];
            // Verifica se o valor é uma string e não contém ponto ou vírgula
            if (typeof value === 'string' && !value.includes('.') && !value.includes(',')) {
                const numericValue = parseFloat(value);
                 // Verifica se é um número inteiro e maior que zero
                if (!isNaN(numericValue) && Number.isInteger(numericValue) && numericValue > 0) {
                    // Divide por 100 e formata como string com duas casas decimais
                    updatedClient[field] = (numericValue / 100).toFixed(2);
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) {
            recordsToUpdate.push(updatedClient);
        }
    }

    if (recordsToUpdate.length > 0) {
        const { error } = await supabase
            .from(TABLE_NAME)
            .upsert(recordsToUpdate, { onConflict: 'cpf' });

        if (error) {
            console.error("Erro ao atualizar as margens:", error);
            throw error;
        }
    }

    return recordsToUpdate.length;
}

// Função para apagar TODOS os clientes da base de dados
export async function deleteAllClients() {
    // Para apagar todas as linhas, o Supabase exige um filtro.
    // Usamos `neq` (not equal) em uma coluna que sempre existirá (como 'id' ou 'cpf')
    // com um valor que nunca será verdadeiro para apagar tudo.
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .neq('cpf', 'NON_EXISTENT_CPF_TO_DELETE_ALL'); // Filtro para apagar tudo

    if (error) {
        console.error("Erro ao apagar todos os clientes:", error);
        throw error;
    }
}
