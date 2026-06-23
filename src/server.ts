import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json({ limit: '10mb' }));

// ── Pastas de dados ───────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
const DATA_FILE = path.join(DATA_DIR, 'documentos.json');

[DATA_DIR, PDFS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Tipagem ───────────────────────────────────────────────────
interface Documento {
  token:       string;
  texto:       string;
  nome:        string;
  cpf:         string;
  criadoEm:   string;
  status:      'pendente' | 'assinado';
  assinatura?: string;  // base64 PNG da assinatura
  foto?:       string;  // base64 JPEG da selfie
  assinadoEm?: string;
  ip?:         string;
  pdfPath?:   string;
}

// ── JSON store ────────────────────────────────────────────────
function load(): Record<string, Documento> {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return {}; }
}
function save(docs: Record<string, Documento>) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2), 'utf-8');
}

// ── Gerar PDF assinado ────────────────────────────────────────
function gerarPdf(doc: Documento): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(PDFS_DIR, `${doc.token}.pdf`);

    const PW = 595.28;   // A4 width pts
    const PH = 841.89;   // A4 height pts
    const ML = 60;
    const W  = PW - ML * 2;  // 475.28

    const now     = doc.assinadoEm ? new Date(doc.assinadoEm) : new Date();
    const dataFmt = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'long' });
    const art299  = 'Art. 299 do Codigo Penal - Omitir, em documento publico ou particular, declaracao que dele devia constar, ou nele inserir ou fazer inserir declaracao falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigacao ou alterar a verdade sobre fato juridicamente relevante.';
    const hash    = crypto.createHash('sha256').update(doc.texto + (doc.assinatura || '')).digest('hex');
    const temFoto = !!(doc.foto && doc.foto.length > 100);

    // Layout fixo página 1:
    // 0-62:    cabeçalho
    // 70-96:   protocolo
    // 108-560: texto (altura máxima 452 pts — truncado se muito longo)
    // 575-633: assinatura
    // 640-686: aviso legal
    // 692-772: auditoria

    const TEXT_TOP  = 108;
    const TEXT_MAX  = 340;   // máximo de altura para o texto na pág. 1
    const SIG_TOP   = 455;
    const SIG_W     = Math.round(W * 0.65);
    const SIG_H     = 90;
    const AVISO_TOP = 562;
    const AVISO_H   = 44;
    const AUDIT_TOP = 614;
    const AUDIT_H   = 76;

    const pdf = new PDFDocument({ size: 'A4', autoFirstPage: false });
    const stream = fs.createWriteStream(filePath);
    pdf.pipe(stream);

    /* ══════════════════ PÁGINA 1 ══════════════════ */
    pdf.addPage({ size: 'A4' });

    // Cabeçalho escuro
    pdf.rect(0, 0, PW, 62).fill('#1a1d27');
    pdf.fill('#ffffff').fontSize(13).font('Helvetica-Bold')
       .text('DECLARACAO DE RESIDENCIA', ML, 18, { width: W, lineBreak: false });
    pdf.fill('#8888aa').fontSize(8.5).font('Helvetica')
       .text('Documento com assinatura digital — validade juridica conforme Lei 14.063/2020', ML, 38, { width: W, lineBreak: false });

    // Protocolo
    pdf.rect(ML, 70, W, 26).fill('#f0f4ff');
    pdf.fill('#1e3a8a').fontSize(8.5).font('Helvetica-Bold')
       .text('PROTOCOLO: ' + doc.token, ML + 8, 79, { width: W - 16, lineBreak: false });

    // Texto da declaração — height limita para não vazar para outra página
    pdf.fill('#111827').fontSize(10.5).font('Helvetica')
       .text(doc.texto, ML, TEXT_TOP, { width: W, align: 'justify', lineGap: 2.5, height: TEXT_MAX, ellipsis: true });

    // Assinatura
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

    // Aviso legal
    pdf.rect(ML, AVISO_TOP, W, AVISO_H).fill('#fffbeb');
    pdf.fill('#92400e').fontSize(7).font('Helvetica-Bold')
       .text('AVISO LEGAL:', ML + 6, AVISO_TOP + 5, { lineBreak: false });
    pdf.font('Helvetica').fill('#78350f')
       .text(art299, ML + 6, AVISO_TOP + 15, { width: W - 12, height: AVISO_H - 18, lineGap: 0.5, ellipsis: true });

    // Auditoria
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

    /* ══════════════════ PÁGINA 2 — FOTO ══════════════════ */
    if (temFoto) {
      pdf.addPage({ size: 'A4' });

      // Cabeçalho
      pdf.rect(0, 0, PW, 62).fill('#1a1d27');
      pdf.fill('#ffffff').fontSize(13).font('Helvetica-Bold')
         .text('FOTO DE VALIDACAO DE IDENTIDADE', ML, 18, { width: W, lineBreak: false });
      pdf.fill('#8888aa').fontSize(8.5).font('Helvetica')
         .text('Selfie capturada no momento da assinatura — ' + doc.nome, ML, 38, { width: W, lineBreak: false });

      // Protocolo
      pdf.rect(ML, 70, W, 26).fill('#f0f4ff');
      pdf.fill('#1e3a8a').fontSize(8.5).font('Helvetica-Bold')
         .text('PROTOCOLO: ' + doc.token, ML + 8, 79, { width: W - 16, lineBreak: false });

      // Foto grande
      const FOTO_TOP = 108;
      const FOTO_H   = PH - FOTO_TOP - 90;  // ~643 pts
      try {
        const fotoBuf = Buffer.from(doc.foto!.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        pdf.image(fotoBuf, ML, FOTO_TOP, { fit: [W, FOTO_H], align: 'center', valign: 'center' });
        pdf.rect(ML, FOTO_TOP, W, FOTO_H).stroke('#c7d2fe');
      } catch (_) {
        pdf.fill('#ef4444').fontSize(10)
           .text('[Foto nao disponivel]', ML, FOTO_TOP + 40, { width: W, align: 'center', lineBreak: false });
      }

      // Rodapé auditoria pág. 2
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
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ── ROTAS ─────────────────────────────────────────────────────

// Lista todos os documentos (sem o base64 da assinatura)
app.get('/api/docs', (_req, res) => {
  const docs = load();
  const lista = Object.values(docs)
    .map(({ assinatura: _, ...d }) => d)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  res.json(lista);
});

// Apaga todos os documentos
app.delete('/api/docs', (_req, res) => {
  save({});
  res.json({ ok: true });
});

// Cria documento e retorna link
app.post('/api/assinar', (req, res) => {
  const { texto, nome, cpf } = req.body as Documento;
  if (!texto || !nome) return res.status(400).json({ erro: 'texto e nome são obrigatórios' });

  const token = crypto.randomUUID();
  const docs  = load();
  docs[token] = { token, texto, nome: nome.trim(), cpf: cpf?.trim() || '', criadoEm: new Date().toISOString(), status: 'pendente' };
  save(docs);

  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  res.json({ link: `${proto}://${host}/assinar/${token}`, token });
});

// Retorna dados do documento
app.get('/api/doc/:token', (req, res) => {
  const doc = load()[req.params.token];
  if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
  // Não expõe a imagem base64 inteira nessa rota
  const { assinatura: _, ...safe } = doc;
  res.json(safe);
});

// Cliente envia assinatura → gera PDF
app.post('/api/doc/:token/concluir', async (req, res) => {
  const docs = load();
  const doc  = docs[req.params.token];
  if (!doc)                    return res.status(404).json({ erro: 'Documento não encontrado.' });
  if (doc.status === 'assinado') return res.status(409).json({ erro: 'Já assinado.' });

  const { assinatura, foto } = req.body as { assinatura: string; foto?: string };
  if (!assinatura) return res.status(400).json({ erro: 'Assinatura é obrigatória.' });

  doc.assinatura = assinatura;
  if (foto) doc.foto = foto;
  doc.assinadoEm = new Date().toISOString();
  doc.ip         = req.ip || '';
  doc.status     = 'assinado';

  try {
    doc.pdfPath = await gerarPdf(doc);
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
  }

  save(docs);
  res.json({ ok: true, assinadoEm: doc.assinadoEm });
});

// Download do PDF assinado
app.get('/api/doc/:token/pdf', (req, res) => {
  const doc = load()[req.params.token];
  if (!doc)                      return res.status(404).json({ erro: 'Não encontrado.' });
  if (doc.status !== 'assinado') return res.status(400).json({ erro: 'Documento ainda não assinado.' });
  if (!doc.pdfPath || !fs.existsSync(doc.pdfPath))
    return res.status(404).json({ erro: 'PDF não disponível.' });

  const nomeArquivo = `declaracao_${doc.nome.replace(/\s+/g, '_')}.pdf`;
  res.download(doc.pdfPath, nomeArquivo);
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
