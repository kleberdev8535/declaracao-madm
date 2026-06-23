export interface OcrData {
  nome?: string
  cpf?: string
  rg?: string
  estadoCivil?: string
  nacionalidade?: string
  profissao?: string
  dataNascimento?: string
  rua?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  telefone?: string
  email?: string
}

export interface CreateDocumentDto {
  titulo: string
  templateId?: string
  clienteId?: string
  ocrData?: OcrData
  responsavel?: string
  advogado?: string
  unidade?: string
  expiresInDays?: number
}

export interface SignDocumentDto {
  documentId: string
  imagemBase64: string
  ip: string
  userAgent?: string
  timezone?: string
  latitude?: number
  longitude?: number
}

export interface EventPayload {
  documentId: string
  status: string
  ip?: string
  userAgent?: string
  descricao?: string
  metadata?: Record<string, unknown>
}
