import { createClient } from '@supabase/supabase-js'

// As chaves são pegas das variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validação para garantir que as variáveis de ambiente foram configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key must be provided in environment variables.');
}

// Cria e exporta o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
