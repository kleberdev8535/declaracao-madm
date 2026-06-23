import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.template.count()
  if (count > 0) {
    console.log('Templates ja existem, seed ignorado.')
    return
  }

  await prisma.template.createMany({
    data: [
      {
        nome: 'Declaracao de Hipossuficiencia',
        descricao: 'Declaracao para fins de assistencia juridica gratuita',
        categoria: 'DECLARACAO',
        conteudo: 'Eu, {{nome}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, inscrito(a) no CPF n: {{cpf}}, portador(a) do RG n: {{rg}}, residente na {{endereco}}, {{cidade}}/{{uf}}, CEP {{cep}}, DECLARO, sob as penas da Lei (Art. 299 do Codigo Penal), ser pessoa hipossuficiente, nao tendo condicoes de arcar com as custas do processo e honorarios advocaticios.\n\n{{cidade}}, {{data_atual}}.\n\n___________________________________\n{{nome}}\nCPF: {{cpf}}',
        variaveis: JSON.stringify(['nome', 'nacionalidade', 'estado_civil', 'profissao', 'cpf', 'rg', 'endereco', 'cidade', 'uf', 'cep', 'data_atual']),
      },
      {
        nome: 'Procuracao Ad Judicia',
        descricao: 'Procuracao para representacao judicial',
        categoria: 'PROCURACAO',
        conteudo: 'PROCURACAO AD JUDICIA ET EXTRA\n\nEu, {{nome}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, inscrito(a) no CPF n: {{cpf}}, portador(a) do RG n: {{rg}}, residente na {{endereco}}, {{cidade}}/{{uf}}, CEP: {{cep}},\n\nNOMEIO E CONSTITUO como meu bastante procurador o(a) Dr(a). ________________________, com poderes para o foro em geral, ad judicia et extra.\n\n{{cidade}}, {{data_atual}}.\n\n___________________________________\n{{nome}}\nCPF: {{cpf}}',
        variaveis: JSON.stringify(['nome', 'nacionalidade', 'estado_civil', 'profissao', 'cpf', 'rg', 'endereco', 'cidade', 'uf', 'cep', 'data_atual']),
      },
      {
        nome: 'Ficha Cadastral',
        descricao: 'Ficha de cadastro do cliente',
        categoria: 'FICHA_CADASTRAL',
        conteudo: 'FICHA CADASTRAL\n\nNome: {{nome}}\nCPF: {{cpf}}\nRG: {{rg}}\nEstado Civil: {{estado_civil}}\nNacionalidade: {{nacionalidade}}\nProfissao: {{profissao}}\nTelefone: {{telefone}}\nE-mail: {{email}}\nEndereco: {{endereco}}, {{cidade}}/{{uf}}, CEP {{cep}}\n\nDeclaro que as informacoes acima sao verdadeiras.\n\n{{cidade}}, {{data_atual}}.\n\n___________________________________\n{{nome}}\nCPF: {{cpf}}',
        variaveis: JSON.stringify(['nome', 'cpf', 'rg', 'estado_civil', 'nacionalidade', 'profissao', 'telefone', 'email', 'endereco', 'cidade', 'uf', 'cep', 'data_atual']),
      },
      {
        nome: 'Termo de Autorizacao',
        descricao: 'Autorizacao para coleta e uso de dados (LGPD)',
        categoria: 'AUTORIZACAO',
        conteudo: 'TERMO DE AUTORIZACAO E CONSENTIMENTO\n\nEu, {{nome}}, inscrito(a) no CPF n: {{cpf}}, portador(a) do RG n: {{rg}}, residente na {{endereco}}, {{cidade}}/{{uf}},\n\nAUTORIZO expressamente o uso e tratamento dos meus dados pessoais conforme a LGPD (Lei 13.709/2018).\n\n{{cidade}}, {{data_atual}}.\n\n___________________________________\n{{nome}}\nCPF: {{cpf}}',
        variaveis: JSON.stringify(['nome', 'cpf', 'rg', 'endereco', 'cidade', 'uf', 'data_atual']),
      },
    ],
  })

  console.log('Seed concluido com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
