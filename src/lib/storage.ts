"use client";

import { db } from './firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

const COLLECTION_NAME = 'clients';

// Armazena os dados validados no Firestore
export async function setValidatedData(data: Record<string, any>[]) {
    if (typeof window !== 'undefined') {
        try {
            const batch = writeBatch(db);
            const clientsCollection = collection(db, COLLECTION_NAME);

            data.forEach(newItem => {
                // Usa o CPF como ID do documento para evitar duplicatas
                const docRef = doc(clientsCollection, newItem.cpf);
                batch.set(docRef, newItem, { merge: true }); // merge: true atualiza se já existir
            });

            await batch.commit();

        } catch (error) {
            console.error("Erro ao salvar dados no Firestore:", error);
            throw error; // Propaga o erro para ser tratado na UI
        }
    }
}

// Recupera os dados validados do Firestore
export async function getValidatedData(): Promise<Record<string, any>[]> {
    if (typeof window !== 'undefined') {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const data: Record<string, any>[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error("Erro ao ler dados do Firestore:", error);
            return [];
        }
    }
    return [];
}