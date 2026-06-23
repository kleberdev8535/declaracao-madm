# Central de Assinaturas — MADM

## Estrutura

```
assinaturas/
├── backend/   → API Express + Socket.IO + Prisma + PostgreSQL
└── frontend/  → React + Vite + Tailwind + Recharts
```

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação — Backend

```bash
cd assinaturas/backend

# Instalar dependências
npm install

# Configurar banco
cp .env.example .env
# Editar .env com sua string de conexão PostgreSQL

# Gerar cliente Prisma + criar tabelas
npx prisma generate
npx prisma migrate dev --name init

# Seed com templates padrão
npx ts-node prisma/seed.ts

# Iniciar em desenvolvimento
npm run dev
```

## Instalação — Frontend

```bash
cd assinaturas/frontend

npm install
npm run dev
```

## URLs

| Serviço      | URL                            |
|--------------|-------------------------------|
| Frontend     | http://localhost:5173          |
| Backend API  | http://localhost:4000/api      |
| Link cliente | http://localhost:4000/assinar/:token |

## Fluxo de uso

1. Acesse **/assinaturas** → Novo Documento
2. Selecione o modelo, preencha os dados do cliente (ou use OCR)
3. O sistema gera o link automaticamente
4. Copie o link e envie ao cliente (WhatsApp, e-mail etc.)
5. O cliente acessa o link, confirma dados, lê e assina
6. O PDF assinado é gerado automaticamente
7. Acompanhe tudo em tempo real na tela de Assinaturas

## Integração com OCR existente

Envie os dados extraídos pelo OCR para criar um documento:

```bash
POST /api/documents
Content-Type: application/json

{
  "titulo": "Declaração de Hipossuficiência",
  "templateId": "<id-do-template>",
  "ocrData": {
    "nome": "João Silva",
    "cpf": "123.456.789-00",
    "rg": "12.345.678-9",
    "estadoCivil": "Casado",
    "nacionalidade": "Brasileiro",
    "profissao": "Autônomo",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cep": "01310-100",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "responsavel": "Maria Consultora",
  "advogado": "Dr. Carlos",
  "expiresInDays": 7
}
```

A resposta inclui o `linkAssinatura` pronto para envio.

## Páginas internas

| Rota             | Função                                      |
|------------------|---------------------------------------------|
| /                | Dashboard                                   |
| /assinaturas     | Central de assinaturas (tabela + criar)     |
| /documentos      | Mesma listagem com filtros avançados        |
| /modelos         | CRUD de templates com editor de variáveis  |
| /clientes        | Base de clientes com histórico              |
| /relatorios      | Gráficos e métricas                         |
| /configuracoes   | Configurações do sistema                    |
| /auditoria       | Logs imutáveis de todos os eventos          |

## Página do cliente (mobile-first)

`/assinar/:token` — 4 passos:
1. Conferir dados pessoais
2. Ler o documento
3. Assinar (canvas com dedo ou mouse)
4. Comprovante com protocolo e hash
