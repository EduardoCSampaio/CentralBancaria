"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getValidatedData } from "@/lib/storage";
import { ArrowLeft, Search, User, AlertTriangle } from "lucide-react";
import { FIELD_LABELS } from "@/lib/constants";

type ClientData = Record<string, any>;

export default function ConsultaPage() {
    const [searchCpf, setSearchCpf] = useState('');
    const [clientData, setClientData] = useState<ClientData | null>(null);
    const [allData, setAllData] = useState<ClientData[]>([]);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const data = getValidatedData();
        setAllData(data);
    }, []);

    const handleSearch = () => {
        const formattedSearchCpf = searchCpf.padStart(11, '0');
        if (!formattedSearchCpf) {
            setClientData(null);
            setNotFound(false);
            return;
        }

        const result = allData.find(client => client.cpf === formattedSearchCpf);

        if (result) {
            setClientData(result);
            setNotFound(false);
        } else {
            setClientData(null);
            setNotFound(true);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };
    
    const formatLabel = (key: string) => {
        return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/" passHref>
                    <Button variant="outline" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Consulta de Cliente</h1>
                    <p className="text-muted-foreground">Encontre informações de clientes processados pelo CPF.</p>
                </div>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Buscar por CPF</CardTitle>
                    <CardDescription>Digite o CPF do cliente para ver os detalhes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input 
                            type="text"
                            placeholder="Digite o CPF..."
                            value={searchCpf}
                            onChange={(e) => setSearchCpf(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button onClick={handleSearch}>
                            <Search className="mr-2" />
                            Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {clientData && (
                <Card className="max-w-2xl mx-auto mt-8 animate-in fade-in-0 zoom-in-95">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User />Informações do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(clientData).map(([key, value]) => (
                                <div key={key}>
                                    <p className="text-sm font-medium text-muted-foreground">{formatLabel(key)}</p>
                                    <p className="text-lg font-semibold">{value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {notFound && (
                 <Card className="max-w-2xl mx-auto mt-8 border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle />Cliente não encontrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">Não foi encontrado nenhum cliente com o CPF informado nos dados processados. Verifique o número e tente novamente.</p>
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
