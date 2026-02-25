export interface ReuniaoFormData {
  clienteNome: string;
  clienteNumero?: string;
  data: string; // YYYY-MM-DD
  valor?: number; // Valor/preço da call (opcional)
}
