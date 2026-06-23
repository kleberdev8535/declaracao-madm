import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib'
import crypto from 'crypto'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

interface GeneratePdfOptions {
  conteudo: string
  nome: string
  cpf: string
  protocolo: string
  hashDocumento: string
  assinaturaBase64: string
  hashAssinatura: string
  ip: string
  signedAt: Date
  linkValidacao?: string
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (para.trim() === '') { lines.push(''); continue }
    const words = para.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        current = test
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

export async function generateSignedPdf(opts: GeneratePdfOptions): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const addPage = (): PDFPage => pdfDoc.addPage([595, 842]) // A4

  let page = addPage()
  const margin = 50
  const contentWidth = 595 - margin * 2
  let y = 792

  const drawText = (text: string, { size = 11, bold = false, color = rgb(0.1, 0.1, 0.1) } = {}) => {
    const font = bold ? helveticaBold : helvetica
    const lines = wrapText(text, font, size, contentWidth)
    for (const line of lines) {
      if (y < 60) { page = addPage(); y = 792 }
      page.drawText(line, { x: margin, y, size, font, color })
      y -= size + 4
    }
    return lines.length
  }

  // Cabeçalho
  page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: rgb(0.1, 0.14, 0.27) })
  page.drawText('CENTRAL DE ASSINATURAS', { x: margin, y: 816, size: 14, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('Documento com Validade Jurídica', { x: margin, y: 802, size: 9, font: helvetica, color: rgb(0.7, 0.7, 0.9) })

  y = 775
  // Protocolo box
  page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 22, color: rgb(0.94, 0.97, 1) })
  page.drawText(`PROTOCOLO: ${opts.protocolo}`, { x: margin + 8, y: y + 3, size: 10, font: helveticaBold, color: rgb(0.1, 0.14, 0.27) })
  y -= 30

  // Conteúdo do documento
  drawText('─'.repeat(80), { size: 8, color: rgb(0.7, 0.7, 0.7) })
  y -= 4
  const bodyLines = wrapText(opts.conteudo, helvetica, 11, contentWidth)
  for (const line of bodyLines) {
    if (y < 120) { page = addPage(); y = 792 }
    page.drawText(line, { x: margin, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) })
    y -= 16
  }

  y -= 20
  drawText('─'.repeat(80), { size: 8, color: rgb(0.7, 0.7, 0.7) })
  y -= 10

  // Assinatura digital
  drawText('ASSINATURA DIGITAL', { size: 10, bold: true })
  y -= 4

  try {
    const sigDataUrl = opts.assinaturaBase64.startsWith('data:')
      ? opts.assinaturaBase64
      : `data:image/png;base64,${opts.assinaturaBase64}`
    const base64Data = sigDataUrl.split(',')[1]
    const sigBytes = Buffer.from(base64Data, 'base64')
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigDims = sigImage.scale(0.4)
    if (y - sigDims.height < 60) { page = addPage(); y = 792 }
    page.drawImage(sigImage, { x: margin, y: y - sigDims.height, width: sigDims.width, height: sigDims.height })
    y -= sigDims.height + 10
  } catch {
    drawText('[Assinatura digital registrada]')
  }

  // Rodapé de auditoria
  if (y < 180) { page = addPage(); y = 792 }
  page.drawRectangle({ x: margin, y: y - 100, width: contentWidth, height: 105, color: rgb(0.97, 0.97, 0.97) })
  y -= 6
  drawText('DADOS DE AUDITORIA', { size: 9, bold: true, color: rgb(0.3, 0.3, 0.3) })
  const dt = opts.signedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'long' })
  drawText(`Assinado em: ${dt}`, { size: 8, color: rgb(0.3, 0.3, 0.3) })
  drawText(`IP do signatário: ${opts.ip}`, { size: 8, color: rgb(0.3, 0.3, 0.3) })
  drawText(`Hash do documento: ${opts.hashDocumento}`, { size: 7, color: rgb(0.4, 0.4, 0.4) })
  drawText(`Hash da assinatura: ${opts.hashAssinatura}`, { size: 7, color: rgb(0.4, 0.4, 0.4) })

  // QR Code de validação
  if (opts.linkValidacao) {
    try {
      const qrDataUrl = await QRCode.toDataURL(opts.linkValidacao, { width: 80, margin: 1 })
      const qrBase64 = qrDataUrl.split(',')[1]
      const qrBytes = Buffer.from(qrBase64, 'base64')
      const qrImage = await pdfDoc.embedPng(qrBytes)
      page.drawImage(qrImage, { x: 595 - margin - 70, y: y - 65, width: 70, height: 70 })
      page.drawText('Valide em:', { x: 595 - margin - 70, y: y - 72, size: 6, font: helvetica, color: rgb(0.5, 0.5, 0.5) })
    } catch {
      // QR code opcional
    }
  }

  const pdfBytes = await pdfDoc.save()
  const fileName = `documento_assinado_${opts.protocolo}.pdf`
  const filePath = path.join(UPLOADS_DIR, fileName)
  fs.writeFileSync(filePath, pdfBytes)
  return filePath
}

export function hashSignature(base64: string): string {
  return crypto.createHash('sha256').update(base64).digest('hex')
}
