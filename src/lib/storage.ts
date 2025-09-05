"use client";

const STORAGE_KEY = 'validatedClientData';

// Armazena os dados validados no localStorage
export function setValidatedData(data: Record<string, any>[]) {
    if (typeof window !== 'undefined') {
        try {
            // Para evitar duplicatas baseadas no CPF, criamos um mapa
            const existingData = getValidatedData();
            const dataMap = new Map(existingData.map(item => [item.cpf, item]));

            // Adiciona ou atualiza novos itens
            data.forEach(newItem => {
                dataMap.set(newItem.cpf, newItem);
            });

            const finalData = Array.from(dataMap.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
        } catch (error) {
            console.error("Erro ao salvar dados no localStorage:", error);
            // Em um cenário real, poderíamos mostrar um toast para o usuário
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
