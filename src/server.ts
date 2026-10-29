import express from 'express';
import path from 'path';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const app  = express();
const PORT = process.env.PORT ?? 3000;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json({ limit: '10mb' }));

// ── Tipagem ───────────────────────────────────────────────────
interface Documento {
  token:        string;
  texto:        string;
  nome:         string;
  cpf:          string;
  criado_em:    string;
  status:       'pendente' | 'assinado';
  assinatura?:  string;
  foto?:        string;
  assinado_em?: string;
  ip?:          string;
  pdf_url?:     string;
}

// ── Gerar PDF em memória ──────────────────────────────────────
function gerarPdfBuffer(doc: Documento): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PW = 595.28;
    const PH = 841.89;
    const ML = 60;
    const W  = PW - ML * 2;

    const now     = doc.assinado_em ? new Date(doc.assinado_em) : new Date();
    const dataFmt = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'long' });
    const art299  = 'Art. 299 do Codigo Penal - Omitir, em documento publico ou particular, declaracao que dele devia constar, ou nele inserir ou fazer inserir declaracao falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigacao ou alterar a verdade sobre fato juridicamente relevante.';
    const hash    = crypto.createHash('sha256').update(doc.texto + (doc.assinatura || '')).digest('hex');
    const temFoto = !!(doc.foto && doc.foto.length > 100);

    const TEXT_TOP  = 108;
    const TEXT_MAX  = 340;
    const SIG_TOP   = 455;
    const SIG_W     = Math.round(W * 0.65);
    const SIG_H     = 90;
    const AVISO_TOP = 562;
    const AVISO_H   = 44;
    const AUDIT_TOP = 614;
    const AUDIT_H   = 76;

    const pdf = new PDFDocument({ size: 'A4', autoFirstPage: false });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.addPage({ size: 'A4' });

    pdf.rect(0, 0, PW, 62).fill('#1a1d27');
    pdf.fill('#ffffff').fontSize(13).font('Helvetica-Bold')
       .text('DECLARACAO DE RESIDENCIA', ML, 18, { width: W, lineBreak: false });
    pdf.fill('#8888aa').fontSize(8.5).font('Helvetica')
       .text('Documento com assinatura digital — validade juridica conforme Lei 14.063/2020', ML, 38, { width: W, lineBreak: false });

    pdf.rect(ML, 70, W, 26).fill('#f0f4ff');
    pdf.fill('#1e3a8a').fontSize(8.5).font('Helvetica-Bold')
       .text('PROTOCOLO: ' + doc.token, ML + 8, 79, { width: W - 16, lineBreak: false });

    pdf.fill('#111827').fontSize(10.5).font('Helvetica')
       .text(doc.texto, ML, TEXT_TOP, { width: W, align: 'justify', lineGap: 2.5, height: TEXT_MAX, ellipsis: true });

    if (doc.assinatura) {
      try {
        const buf = Buffer.from(doc.assinatura.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        pdf.image(buf, ML, SIG_TOP, { width: SIG_W, height: SIG_H - 4, fit: [SIG_W, SIG_H - 4] });
      } catch (_) {}
    }
    pdf.moveTo(ML, SIG_TOP + SIG_H - 2).lineTo(ML + SIG_W, SIG_TOP + SIG_H - 2)
       .strokeColor('#9ca3af').lineWidth(0.7).stroke();
    pdf.fill('#6b7280').fontSize(7).font('Helvetica')
       .text('Assinatura do Cliente', ML, SIG_TOP + SIG_H + 2, { width: SIG_W, align: 'center', lineBreak: false });

    pdf.rect(ML, AVISO_TOP, W, AVISO_H).fill('#fffbeb');
    pdf.fill('#92400e').fontSize(7).font('Helvetica-Bold')
       .text('AVISO LEGAL:', ML + 6, AVISO_TOP + 5, { lineBreak: false });
    pdf.font('Helvetica').fill('#78350f')
       .text(art299, ML + 6, AVISO_TOP + 15, { width: W - 12, height: AVISO_H - 18, lineGap: 0.5, ellipsis: true });

    pdf.rect(ML, AUDIT_TOP, W, AUDIT_H).fill('#f8fafc');
    pdf.fill('#64748b').fontSize(7).font('Helvetica-Bold')
       .text('DADOS DE AUDITORIA', ML + 8, AUDIT_TOP + 6, { lineBreak: false });
    [
      'Signatario: ' + doc.nome + '  (CPF: ' + (doc.cpf || 'nao informado') + ')',
      'Assinado em: ' + dataFmt,
      'IP de origem: ' + (doc.ip || 'nao registrado'),
      'Hash SHA-256: ' + hash,
    ].forEach((line, i) => {
      pdf.font('Helvetica').fill('#374151')
         .text(line, ML + 8, AUDIT_TOP + 18 + i * 13, { width: W - 16, lineBreak: false });
    });

    if (temFoto) {
      pdf.addPage({ size: 'A4' });

      pdf.rect(0, 0, PW, 62).fill('#1a1d27');
      pdf.fill('#ffffff').fontSize(13).font('Helvetica-Bold')
         .text('FOTO DE VALIDACAO DE IDENTIDADE', ML, 18, { width: W, lineBreak: false });
      pdf.fill('#8888aa').fontSize(8.5).font('Helvetica')
         .text('Selfie capturada no momento da assinatura — ' + doc.nome, ML, 38, { width: W, lineBreak: false });

      pdf.rect(ML, 70, W, 26).fill('#f0f4ff');
      pdf.fill('#1e3a8a').fontSize(8.5).font('Helvetica-Bold')
         .text('PROTOCOLO: ' + doc.token, ML + 8, 79, { width: W - 16, lineBreak: false });

      const FOTO_TOP = 108;
      const FOTO_H   = PH - FOTO_TOP - 90;
      try {
        const fotoBuf = Buffer.from(doc.foto!.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        pdf.image(fotoBuf, ML, FOTO_TOP, { fit: [W, FOTO_H], align: 'center', valign: 'center' });
        pdf.rect(ML, FOTO_TOP, W, FOTO_H).stroke('#c7d2fe');
      } catch (_) {}

      const F2_TOP = PH - 78;
      pdf.rect(ML, F2_TOP, W, 60).fill('#f8fafc');
      pdf.fill('#64748b').fontSize(7).font('Helvetica-Bold')
         .text('DADOS DE AUDITORIA - FOTO', ML + 8, F2_TOP + 6, { lineBreak: false });
      pdf.font('Helvetica').fill('#374151')
         .text('Signatario: ' + doc.nome + '  (CPF: ' + (doc.cpf || 'nao informado') + ')', ML + 8, F2_TOP + 18, { lineBreak: false })
         .text('Capturada em: ' + dataFmt, ML + 8, F2_TOP + 30, { lineBreak: false })
         .text('IP: ' + (doc.ip || 'nao registrado'), ML + 8, F2_TOP + 42, { lineBreak: false });
    }

    pdf.end();
  });
}

// ── ROTAS ─────────────────────────────────────────────────────

// Lista todos os documentos
app.get('/api/docs', async (_req, res) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('token, nome, cpf, criado_em, status, assinado_em, ip, pdf_url')
    .order('criado_em', { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// Apaga todos os documentos
app.delete('/api/docs', async (_req, res) => {
  await supabase.from('documentos').delete().neq('token', '');
  res.json({ ok: true });
});

// Cria documento e retorna link
app.post('/api/assinar', async (req, res) => {
  const { texto, nome, cpf } = req.body;
  if (!texto || !nome) return res.status(400).json({ erro: 'texto e nome são obrigatórios' });

  const token = crypto.randomUUID();
  const { error } = await supabase.from('documentos').insert({
    token, texto, nome: nome.trim(), cpf: cpf?.trim() || '', status: 'pendente',
  });
  if (error) return res.status(500).json({ erro: error.message });

  const host  = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  res.json({ link: `${proto}://${host}/assinar/${token}`, token });
});

// Monta o texto da declaração (mesmo modelo do painel em public/app.js)
function montarTextoDeclaracao(d: Record<string, string>): string {
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });

  const endParts: string[] = [];
  if (d.rua)         endParts.push(d.rua);
  if (d.numero)      endParts.push('N°: ' + d.numero);
  if (d.complemento) endParts.push(d.complemento);
  if (d.bairro)      endParts.push('Bairro ' + d.bairro);
  if (d.cidade)      endParts.push('Cidade ' + d.cidade);
  if (d.uf)          endParts.push('UF: ' + d.uf);
  if (d.cep)         endParts.push('CEP ' + d.cep);

  const localData = d.cidade && d.uf
    ? d.cidade + ' - ' + d.uf + ', ' + dateStr + '.'
    : '_____________________________, ' + dateStr + '.';

  return 'Eu, ' + d.nome + ', ' +
    (d.nacionalidade || 'brasileiro(a)') + ', ' +
    (d.estado_civil || 'solteiro(a)') + ', ' +
    (d.profissao || '_______________') + ', ' +
    'devidamente inscrito(a) no CPF sob o N°: ' + (d.cpf || '___.___.___-__') + ', ' +
    'portador(a) da cédula de identidade N° ' + (d.rg || '__________') + ', ' +
    'DECLARO para os devidos fins, segundo o Art. 299 do Código Penal – Omitir, em documento público ou particular, declaração que dele devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre fato juridicamente relevante, ' +
    'ser residente e domiciliado(a) na ' + endParts.join(', ') + '.\n' +
    '\n' +
    localData;
}

// Cria a declaração automaticamente a partir dos dados enviados pelo Make
app.post('/api/declaracao', async (req, res) => {
  const chave = process.env.MAKE_API_KEY;
  if (chave && req.headers['x-api-key'] !== chave) {
    return res.status(401).json({ erro: 'Chave de API inválida.' });
  }

  const campos = ['nome', 'nacionalidade', 'estado_civil', 'profissao', 'rg', 'cpf',
                  'rua', 'numero', 'complemento', 'bairro', 'cep', 'cidade', 'uf'];
  const d: Record<string, string> = {};
  for (const c of campos) d[c] = String(req.body?.[c] ?? '').trim();
  d.uf = d.uf.toUpperCase();

  if (!d.nome) return res.status(400).json({ erro: 'O campo "nome" é obrigatório.' });

  // ID do cliente na HubSpot, devolvido ao Make quando o documento for assinado
  const cliente_id = String(req.body?.cliente_id ?? '').trim();

  const token = crypto.randomUUID();
  const texto = montarTextoDeclaracao(d);
  const { error } = await supabase.from('documentos').insert({
    token, texto, nome: d.nome, cpf: d.cpf, status: 'pendente', cliente_id,
  });
  if (error) return res.status(500).json({ erro: error.message });

  const host  = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  res.json({ link: `${proto}://${host}/assinar/${token}`, token, cliente_id, texto });
});

// Retorna dados do documento
app.get('/api/doc/:token', async (req, res) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('token, nome, cpf, texto, criado_em, status, assinado_em, ip, pdf_url')
    .eq('token', req.params.token)
    .single();
  if (error || !data) return res.status(404).json({ erro: 'Documento não encontrado.' });
  res.json(data);
});

// Apaga um documento individual
app.delete('/api/doc/:token', async (req, res) => {
  await supabase.storage.from('pdfs').remove([`${req.params.token}.pdf`]);
  await supabase.from('documentos').delete().eq('token', req.params.token);
  res.json({ ok: true });
});

// Cliente envia assinatura → gera PDF e sobe no Supabase Storage
app.post('/api/doc/:token/concluir', async (req, res) => {
  const { data: doc, error: fetchErr } = await supabase
    .from('documentos')
    .select('*')
    .eq('token', req.params.token)
    .single();

  if (fetchErr || !doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
  if (doc.status === 'assinado') return res.status(409).json({ erro: 'Já assinado.' });

  const { assinatura, foto } = req.body;
  if (!assinatura) return res.status(400).json({ erro: 'Assinatura é obrigatória.' });

  const assinado_em = new Date().toISOString();
  const ip = req.ip || '';

  let pdf_url = '';
  let pdfBuffer: Buffer | null = null;
  try {
    const docCompleto = { ...doc, assinatura, foto, assinado_em, ip };
    pdfBuffer = await gerarPdfBuffer(docCompleto);
    const fileName  = `${doc.token}.pdf`;
    await supabase.storage.from('pdfs').upload(fileName, pdfBuffer, {
      contentType: 'application/pdf', upsert: true,
    });
    const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
    pdf_url = urlData.publicUrl;
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
  }

  await supabase.from('documentos').update({
    assinatura, foto, assinado_em, ip, status: 'assinado', pdf_url,
  }).eq('token', req.params.token);

  res.json({ ok: true, assinadoEm: assinado_em, assinado_em });

  const host  = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  notificarMake({
    token: doc.token, cliente_id: doc.cliente_id || '', nome: doc.nome, cpf: doc.cpf, assinado_em, ip, pdf_url,
    link: `${proto}://${host}/assinar/${doc.token}`,
  }, pdfBuffer);
});

// Avisa o Make que o cliente assinou, enviando o PDF completo como arquivo
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

async function notificarMake(dados: Record<string, string>, pdf: Buffer | null) {
  if (!MAKE_WEBHOOK_URL) return;
  try {
    const form = new FormData();
    for (const [k, v] of Object.entries(dados)) form.append(k, v ?? '');
    form.append('status', 'assinado');
    if (pdf) {
      const nomeArquivo = `Declaracao_${(dados.nome || dados.token).replace(/[^\w]+/g, '_')}.pdf`;
      form.append('arquivo', new Blob([new Uint8Array(pdf)],{ type: 'application/pdf' }), nomeArquivo);
    }
    const r = await fetch(MAKE_WEBHOOK_URL, { method: 'POST', body: form });
    if (!r.ok) console.error('Webhook do Make respondeu', r.status, await r.text());
  } catch (e) {
    console.error('Erro ao notificar o Make:', e);
  }
}

// Download do PDF assinado — redireciona para Supabase Storage
app.get('/api/doc/:token/pdf', async (req, res) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('status, pdf_url, nome')
    .eq('token', req.params.token)
    .single();
  if (error || !data) return res.status(404).json({ erro: 'Não encontrado.' });
  if (data.status !== 'assinado') return res.status(400).json({ erro: 'Documento ainda não assinado.' });
  if (!data.pdf_url) return res.status(404).json({ erro: 'PDF não disponível.' });
  res.redirect(data.pdf_url);
});

// Página de assinatura do cliente
app.get('/assinar/:token', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'assinar.html'));
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
export default app;
