"use client";

const STORAGE_KEY = 'validatedClientData';

// Armazena os dados validados no localStorage
export function setValidatedData(data: Record<string, any>[]) {
    if (typeof window !== 'undefined') {
        try {
            const existingData = getValidatedData();
            
            // Cria um mapa dos CPFs existentes para evitar duplicatas
            const existingCpfMap = new Map(existingData.map(item => [item.cpf, item]));

            // Adiciona ou atualiza os novos dados
            data.forEach(newItem => {
                existingCpfMap.set(newItem.cpf, newItem);
            });

            const mergedData = Array.from(existingCpfMap.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
        } catch (error) {
            console.error("Erro ao salvar dados no localStorage:", error);
        }
    }
}

// Recupera os dados validados do localStorage
export function getValidatedData(): Record<string, any>[] {
    if (typeof window !== 'undefined') {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Erro ao ler dados do localStorage:", error);
            return [];
        }
    }
    return [];
}
