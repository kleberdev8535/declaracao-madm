/**
 * app.js — OCR Document Reader
 * Lógica frontend vanilla JS (sem módulos ES)
 *
 * Seções:
 *  1. Estado do formulário
 *  2. Uploader (tarefa 7.1)
 *  3. OCR Engine (tarefa 7.4)
 *  4. Extractor + Validator (tarefa 7.5)
 *  5. Declaration Generator (tarefa 7.7)
 *  6. Toggle texto bruto
 *  7. Inicialização
 */

(function () {
  'use strict';

  /* =========================================================
   * 1. ESTADO DO FORMULÁRIO
   * ========================================================= */

  var formState = {
    nome:          { value: '', source: 'none' },
    nacionalidade: { value: '', source: 'none' },
    estadoCivil:   { value: '', source: 'none' },
    profissao:     { value: '', source: 'none' },
    cpf:           { value: '', source: 'none' },
    rg:            { value: '', source: 'none' },
    rua:           { value: '', source: 'none' },
    numero:        { value: '', source: 'none' },
    complemento:   { value: '', source: 'none' },
    bairro:        { value: '', source: 'none' },
    cep:           { value: '', source: 'none' },
    cidade:        { value: '', source: 'none' },
    uf:            { value: '', source: 'none' },
  };

  /* =========================================================
   * 2. UPLOADER (tarefa 7.1)
   * ========================================================= */

  var ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
  var MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  function validateFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { ok: false, reason: 'invalid-type' };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { ok: false, reason: 'too-large' };
    }
    return { ok: true };
  }

  function showFileError(reason) {
    var el = document.getElementById('file-name');
    if (reason === 'invalid-type') {
      el.textContent = 'Formato inválido. Aceitos: PNG, JPG, JPEG e PDF.';
    } else if (reason === 'too-large') {
      el.textContent = 'Arquivo muito grande. O limite é 10 MB.';
    } else {
      el.textContent = 'Erro ao processar o arquivo.';
    }
    el.classList.add('error');
    hidePreview();
  }

  function showFileName(name) {
    var el = document.getElementById('file-name');
    el.textContent = 'Arquivo selecionado: ' + name;
    el.classList.remove('error');
  }

  function showPreview(file) {
    var preview = document.getElementById('file-preview');
    var img = document.getElementById('preview-img');
    if (file.type.startsWith('image/')) {
      var url = URL.createObjectURL(file);
      img.src = url;
      img.onload = function () { URL.revokeObjectURL(url); };
      preview.hidden = false;
    } else {
      hidePreview();
    }
  }

  function hidePreview() {
    var preview = document.getElementById('file-preview');
    var img = document.getElementById('preview-img');
    preview.hidden = true;
    img.src = '';
  }

  function handleFileSelected(file) {
    var result = validateFile(file);
    if (!result.ok) {
      showFileError(result.reason);
      return;
    }
    showFileName(file.name);
    showPreview(file);
    processFile(file);
  }

  function initUploader() {
    var dropZone  = document.getElementById('drop-zone');
    var btnSelect = document.getElementById('btn-select-file');
    var fileInput = document.getElementById('file-input');

    // Botão abre o seletor de arquivo
    btnSelect.addEventListener('click', function () {
      fileInput.click();
    });

    // Seleção via input
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        handleFileSelected(fileInput.files[0]);
        fileInput.value = ''; // reset para permitir re-seleção do mesmo arquivo
      }
    });

    // Drag-and-drop
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function () {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files[0]) {
        handleFileSelected(files[0]);
      }
    });

    // Acessibilidade: Enter/Space no drop-zone
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
  }

  /* =========================================================
   * 3. OCR ENGINE (tarefa 7.4)
   * ========================================================= */

  function setStatus(text) {
    document.getElementById('status-text').textContent = text;
  }

  function showStatusArea() {
    var el = document.getElementById('card-status');
    if (el) el.hidden = false;
  }

  /**
   * Renderiza todas as páginas de um PDF em canvas e retorna array de HTMLCanvasElement.
   */
  async function pdfToCanvases(file) {
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var canvases = [];

    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale: 2.0 }); // escala 2x para melhor OCR
      var canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      var ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      canvases.push(canvas);
    }

    return canvases;
  }

  /**
   * Processa um arquivo (imagem ou PDF) com OCR e preenche o formulário.
   * O arquivo não é guardado em variável global — é descartado após o uso.
   */
  async function processFile(file) {
    showStatusArea();
    setStatus('Lendo imagem...');

    try {
      var rawText = '';

      if (file.type === 'application/pdf') {
        // PDF: renderizar páginas e fazer OCR em cada canvas
        setStatus('Convertendo PDF...');
        var canvases = await pdfToCanvases(file);
        var pageTexts = [];

        for (var i = 0; i < canvases.length; i++) {
          setStatus('Lendo página ' + (i + 1) + ' de ' + canvases.length + '...');
          var result = await Tesseract.recognize(canvases[i], 'por+eng', {
            logger: function (m) {
              if (m.status === 'recognizing text') {
                setStatus('OCR página ' + (i + 1) + ': ' + Math.round(m.progress * 100) + '%');
              }
            },
          });
          pageTexts.push(result.data.text);
        }

        rawText = pageTexts.join('\n\n');
      } else {
        // Imagem: OCR direto
        var ocrResult = await Tesseract.recognize(file, 'por+eng', {
          logger: function (m) {
            if (m.status === 'recognizing text') {
              setStatus('Lendo imagem: ' + Math.round(m.progress * 100) + '%');
            }
          },
        });
        rawText = ocrResult.data.text;
      }

      // Exibir texto bruto
      document.getElementById('raw-text').value = rawText;

      // Extrair e preencher campos
      extractAndFill(rawText);

    } catch (err) {
      console.error('Erro no OCR:', err);
      setStatus('Erro ao processar o arquivo. Verifique se o arquivo não está corrompido.');
    }
  }

  /* =========================================================
   * 4. EXTRACTOR + VALIDATOR (tarefa 7.5)
   *    Portado de src/extractor.ts e src/validator.ts
   * ========================================================= */

  // --- Validator ---

  function validateCpf(raw) {
    var digits = raw.replace(/\D/g, '');

    if (digits.length !== 11) {
      return { valid: false, formatted: null, error: 'CPF deve conter exatamente 11 dígitos' };
    }

    if (/^(\d)\1{10}$/.test(digits)) {
      return { valid: false, formatted: null, error: 'CPF inválido: todos os dígitos são iguais' };
    }

    // Dígito verificador 1
    var sum1 = digits.slice(0, 9).split('').reduce(function (acc, d, idx) {
      return acc + Number(d) * (10 - idx);
    }, 0);
    var rem1   = sum1 % 11;
    var check1 = rem1 < 2 ? 0 : 11 - rem1;

    if (check1 !== Number(digits[9])) {
      return { valid: false, formatted: null, error: 'Dígitos verificadores inválidos' };
    }

    // Dígito verificador 2
    var sum2 = digits.slice(0, 10).split('').reduce(function (acc, d, idx) {
      return acc + Number(d) * (11 - idx);
    }, 0);
    var rem2   = sum2 % 11;
    var check2 = rem2 < 2 ? 0 : 11 - rem2;

    if (check2 !== Number(digits[10])) {
      return { valid: false, formatted: null, error: 'Dígitos verificadores inválidos' };
    }

    var formatted = digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
    return { valid: true, formatted: formatted, error: null };
  }

  // --- Extractor (portado de src/extractor.ts) ---

  var LINE_EXTRACTORS = [
    { field: 'nome',          re: /^nome(?:\s+completo)?\s+(.+)/i },
    { field: 'nacionalidade', re: /^nacionalidade\s+(.+)/i },
    { field: 'estadoCivil',   re: /^estado\s*civil\s+(.+)/i },
    { field: 'profissao',     re: /^profiss[aã]o(?:\s+atual)?\s+(.+)/i },
    { field: 'rg',            re: /^r\.?\s*g\.?\s+(.+)/i },
    { field: 'rg',            re: /^identidade\s+(.+)/i },
    { field: 'rg',            re: /^registro\s+geral\s+(.+)/i },
    { field: 'cpf',           re: /^cpf\s+(.+)/i },
    { field: 'rua',           re: /^rua\s+(.+)/i },
    { field: 'rua',           re: /^avenida\s+(.+)/i },
    { field: 'rua',           re: /^av\.?\s+(.+)/i },
    { field: 'rua',           re: /^logradouro\s+(.+)/i },
    { field: 'rua',           re: /^endere[cç]o\s+(.+)/i },
    { field: 'numero',        re: /^n[uú]mero\s+(.+)/i },
    { field: 'numero',        re: /^n[°º\.]\s*(.+)/i },
    { field: 'complemento',   re: /^complemento\s+(.+)/i },
    { field: 'bairro',        re: /^bairro\s+(.+)/i },
    { field: 'cep',           re: /^cep\s+(.+)/i },
    { field: 'cidade',        re: /^cidade\s+(.+)/i },
    { field: 'uf',            re: /^uf\s+(.+)/i },
    { field: 'uf',            re: /^estado\s+([A-Z]{2})$/i },
  ];

  var CPF_RE = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/;
  var CEP_RE = /\b\d{5}-?\d{3}\b/;
  var RG_RE  = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]?\b/;

  function normalizeText(text) {
    // Normaliza quebras e espaços
    var t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();

    // Insere \n antes de cada rótulo conhecido para separar campos que vieram colados
    // Ex: "Nome JOAO CPF 123" → "Nome JOAO\nCPF 123"
    var labels = [
      'Nacionalidade', 'Estado Civil', 'Profissão Atual', 'Profissao Atual',
      'Profissão', 'Profissao', 'RG', 'CPF', 'Rua', 'Avenida', 'Logradouro',
      'Endereço', 'Endereco', 'Número', 'Numero', 'Complemento', 'Bairro',
      'CEP', 'Cidade', 'UF', 'Nome'
    ];
    labels.forEach(function(label) {
      // Insere \n antes do rótulo quando ele aparece no meio de uma linha
      // (precedido por letra/número, não no início)
      var re = new RegExp('([a-záéíóúàâêôãõüçA-Z0-9,\\.])\\s+(' + label + ')\\s', 'g');
      t = t.replace(re, '$1\n$2 ');
    });

    return t;
  }

  function extractData(rawText) {
    var text  = normalizeText(rawText);
    var lines = text.split('\n');

    var result = {
      nome: null, nacionalidade: null, estadoCivil: null, profissao: null,
      cpf: null, rg: null, rua: null, numero: null, complemento: null,
      bairro: null, cep: null, cidade: null, uf: null,
    };

    // Passo 1: rótulo no início da linha
    for (var i = 0; i < lines.length; i++) {
      var trimmed = lines[i].trim();
      if (!trimmed) continue;
      for (var j = 0; j < LINE_EXTRACTORS.length; j++) {
        var m = trimmed.match(LINE_EXTRACTORS[j].re);
        if (m) {
          var value = m[1].trim();
          if (value && !result[LINE_EXTRACTORS[j].field]) {
            result[LINE_EXTRACTORS[j].field] = value;
          }
          break;
        }
      }
    }

    // Passo 2: fallback regex
    if (!result.cpf) { var mc = text.match(CPF_RE); if (mc) result.cpf = mc[0].trim(); }
    if (!result.cep) { var mce = text.match(CEP_RE); if (mce) result.cep = mce[0].trim(); }
    if (!result.rg) {
      for (var k = 0; k < lines.length; k++) {
        if (/\bR\.?\s*G\.?\b/i.test(lines[k])) {
          // Tenta pegar número na mesma linha
          var mr = lines[k].match(/\b\d[\d.\-\/X]+\b/i);
          if (mr) { result.rg = mr[0].trim(); break; }
          // Tenta pegar na linha seguinte
          if (k + 1 < lines.length) {
            var mrNext = lines[k + 1].match(/\b\d[\d.\-\/X]+\b/i);
            if (mrNext) { result.rg = mrNext[0].trim(); break; }
          }
        }
      }
    }

    return result;
  }

  // --- Preencher campo no DOM ---

  function fillField(fieldId, value, stateKey) {
    var input = document.getElementById(fieldId);
    if (!input) return;
    input.value = value;
    input.classList.remove('manual-filled');
    input.classList.add('auto-filled');
    formState[stateKey].value  = value;
    formState[stateKey].source = 'auto';
  }

  // --- extractAndFill ---

  function extractAndFill(rawText) {
    setStatus('Extraindo dados...');

    var data = extractData(rawText);

    var fieldMap = [
      { key: 'nome',          id: 'field-nome'         },
      { key: 'nacionalidade', id: 'field-nacionalidade' },
      { key: 'estadoCivil',   id: 'field-estado-civil'  },
      { key: 'profissao',     id: 'field-profissao'     },
      { key: 'cpf',           id: 'field-cpf'           },
      { key: 'rg',            id: 'field-rg'            },
      { key: 'rua',           id: 'field-rua'           },
      { key: 'numero',        id: 'field-numero'        },
      { key: 'complemento',   id: 'field-complemento'   },
      { key: 'bairro',        id: 'field-bairro'        },
      { key: 'cep',           id: 'field-cep'           },
      { key: 'cidade',        id: 'field-cidade'        },
      { key: 'uf',            id: 'field-uf'            },
    ];

    fieldMap.forEach(function (f) {
      if (data[f.key] !== null && formState[f.key] && formState[f.key].source !== 'manual') {
        fillField(f.id, data[f.key], f.key);
      }
    });

    // Validar CPF
    var cpfInput = document.getElementById('field-cpf');
    var cpfError = document.getElementById('cpf-error');

    if (data.cpf !== null) {
      var validation = validateCpf(data.cpf);
      if (validation.valid && formState.cpf.source !== 'manual') {
        fillField('field-cpf', validation.formatted, 'cpf');
      }
    }

    setStatus('Dados extraídos com sucesso!');
  }

  // --- Detectar edição manual ---

  function initManualEditDetection() {
    var fieldMap = [
      { key: 'nome',          id: 'field-nome'          },
      { key: 'nacionalidade', id: 'field-nacionalidade'  },
      { key: 'estadoCivil',   id: 'field-estado-civil'   },
      { key: 'profissao',     id: 'field-profissao'      },
      { key: 'cpf',           id: 'field-cpf'            },
      { key: 'rg',            id: 'field-rg'             },
      { key: 'rua',           id: 'field-rua'            },
      { key: 'numero',        id: 'field-numero'         },
      { key: 'complemento',   id: 'field-complemento'    },
      { key: 'bairro',        id: 'field-bairro'         },
      { key: 'cep',           id: 'field-cep'            },
      { key: 'cidade',        id: 'field-cidade'         },
      { key: 'uf',            id: 'field-uf'             },
    ];

    fieldMap.forEach(function (f) {
      var input = document.getElementById(f.id);
      if (!input) return;

      input.addEventListener('input', function () {
        formState[f.key].value  = input.value;
        formState[f.key].source = 'manual';
        input.classList.remove('auto-filled');
        input.classList.add('manual-filled');
      });
    });
  }

  /* =========================================================
   * 5. DECLARATION GENERATOR (tarefa 7.7)
   * ========================================================= */

  function getFieldValue(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function generateDeclaration() {
    var nome          = getFieldValue('field-nome');
    var nacionalidade = getFieldValue('field-nacionalidade');
    var estadoCivil   = getFieldValue('field-estado-civil');
    var profissao     = getFieldValue('field-profissao');
    var cpf           = getFieldValue('field-cpf');
    var rg            = getFieldValue('field-rg');
    var rua           = getFieldValue('field-rua');
    var numero        = getFieldValue('field-numero');
    var complemento   = getFieldValue('field-complemento');
    var bairro        = getFieldValue('field-bairro');
    var cep           = getFieldValue('field-cep');
    var cidade        = getFieldValue('field-cidade');
    var uf            = getFieldValue('field-uf').toUpperCase();

    var missing = [];
    if (!nome) missing.push('Nome completo');
    if (!cpf)  missing.push('CPF');
    if (missing.length > 0) {
      alert('Por favor, preencha os seguintes campos obrigatórios:\n\n• ' + missing.join('\n• '));
      return;
    }

    var today = new Date();
    var dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Montar endereço: Rua, N°, Complemento, Bairro, Cidade, UF, CEP
    var endParts = [];
    if (rua)         endParts.push(rua);
    if (numero)      endParts.push('N°: ' + numero);
    if (complemento) endParts.push(complemento);
    if (bairro)      endParts.push('Bairro ' + bairro);
    if (cidade)      endParts.push('Cidade ' + cidade);
    if (uf)          endParts.push('UF: ' + uf);
    if (cep)         endParts.push('CEP ' + cep);
    var enderecoDecl = endParts.join(', ');

    // Local e data
    var localData = cidade && uf
      ? cidade + ' - ' + uf + ', ' + dateStr + '.'
      : '_____________________________, ' + dateStr + '.';

    var text =
      'Eu, ' + nome + ', ' +
      (nacionalidade || 'brasileiro(a)') + ', ' +
      (estadoCivil || 'solteiro(a)') + ', ' +
      (profissao || '_______________') + ', ' +
      'devidamente inscrito(a) no CPF sob o N°: ' + (cpf || '___.___.___-__') + ', ' +
      'portador(a) da cédula de identidade N° ' + (rg || '__________') + ', ' +
      'DECLARO para os devidos fins, segundo o Art. 299 do Código Penal – Omitir, em documento público ou particular, declaração que dele devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre fato juridicamente relevante, ' +
      'ser residente e domiciliado(a) na ' + enderecoDecl + '.\n' +
      '\n' +
      localData;

    document.getElementById('declaration-text').value = text;
    document.getElementById('declaration-area').hidden = false;
    document.getElementById('declaration-area').scrollIntoView({ behavior: 'smooth' });
  }

  function initDeclarationGenerator() {
    document.getElementById('btn-gerar').addEventListener('click', generateDeclaration);

    // Copiar para clipboard
    document.getElementById('btn-copy').addEventListener('click', function () {
      var text = document.getElementById('declaration-text').value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(function () {
        var btn = document.getElementById('btn-copy');
        var original = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(function () { btn.textContent = original; }, 2000);
      }).catch(function (err) {
        console.error('Erro ao copiar:', err);
        alert('Não foi possível copiar o texto. Selecione e copie manualmente.');
      });
    });

    // Baixar PDF
    document.getElementById('btn-download-pdf').addEventListener('click', function () {
      var text = document.getElementById('declaration-text').value;
      if (!text) return;

      var art299 =
        'Art. 299 do Código Penal – Omitir, em documento público ou particular, ' +
        'declaração que dele devia constar, ou nele inserir ou fazer inserir declaração ' +
        'falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, ' +
        'criar obrigação ou alterar a verdade sobre fato juridicamente relevante.';

      var pdfText = text.replace(
        'segundo o Art. 299 do Código Penal,',
        'sob as penas do Art. 299 do Código Penal (' + art299 + '),'
      );

      try {
        var jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) {
          alert('Biblioteca jsPDF não disponível. Tente recarregar a página.');
          return;
        }

        var doc = new jsPDF({ unit: 'mm', format: 'a4' });
        var margin   = 20;
        var pageW    = doc.internal.pageSize.getWidth();
        var maxWidth = pageW - margin * 2;
        var lineH    = 7;
        var y        = margin;

        var lines = doc.splitTextToSize(pdfText, maxWidth);
        lines.forEach(function (line) {
          if (y + lineH > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineH;
        });

        doc.save('declaracao.pdf');
      } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        alert('Erro ao gerar o PDF. Tente novamente.');
      }
    });
  }

  /* =========================================================
   * 5b. ENVIAR PARA ASSINATURA
   * ========================================================= */

  function initEnviarAssinatura() {
    var btnEnviar = document.getElementById('btn-enviar-assinatura');
    if (!btnEnviar) return;

    btnEnviar.addEventListener('click', async function () {
      var texto = document.getElementById('declaration-text').value;
      var nome  = getFieldValue('field-nome');
      var cpf   = getFieldValue('field-cpf');

      if (!texto) {
        alert('Gere a declaração antes de enviar para assinatura.');
        return;
      }
      if (!nome) {
        alert('O campo Nome é obrigatório para gerar o link de assinatura.');
        return;
      }

      btnEnviar.disabled = true;
      btnEnviar.innerHTML = 'Gerando link...';

      try {
        var response = await fetch('https://declaracao-madm.onrender.com/api/assinar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto, nome: nome, cpf: cpf }),
        });

        if (!response.ok) throw new Error('Erro ao criar link');

        var data = await response.json();

        // Exibe o link
        document.getElementById('link-assinatura').value = data.link;
        document.getElementById('link-area').hidden = false;
        document.getElementById('link-area').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('link-polling').hidden = false;
        document.getElementById('link-status').textContent = '';

        // Inicia polling para verificar quando o cliente assinar
        var poll = setInterval(async function () {
          try {
            var r = await fetch('https://declaracao-madm.onrender.com/api/doc/' + data.token);
            var doc = await r.json();
            if (doc.status === 'assinado') {
              clearInterval(poll);
              document.getElementById('link-polling').hidden = true;
              var assinadoEm = new Date(doc.assinado_em).toLocaleString('pt-BR');
              document.getElementById('link-status').innerHTML =
                '<span style="color:var(--green);font-weight:700">✓ Assinado em ' + assinadoEm + '</span>'
                + ' &nbsp;—&nbsp; '
                + '<a href="https://declaracao-madm.onrender.com/api/doc/' + data.token + '/pdf" target="_blank">⬇️ Baixar PDF assinado</a>';
            }
          } catch (e) { /* silencioso */ }
        }, 5000);

      } catch (err) {
        alert('Erro ao gerar link de assinatura. Verifique se o servidor está rodando.');
        console.error(err);
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar para Assinatura';
      }
    });

    // Copiar link
    var btnCopyLink = document.getElementById('btn-copy-link');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', function () {
        var link = document.getElementById('link-assinatura').value;
        if (!link) return;
        navigator.clipboard.writeText(link).then(function () {
          btnCopyLink.textContent = 'Copiado!';
          setTimeout(function () { btnCopyLink.textContent = 'Copiar'; }, 2000);
        });
      });
    }
  }

  /* =========================================================
   * 6. TOGGLE TEXTO BRUTO
   * ========================================================= */

  function initToggleRaw() {
    var btn  = document.getElementById('toggle-raw');
    var area = document.getElementById('raw-text-area');

    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      area.hidden = expanded;
      btn.textContent = expanded ? 'Ver texto bruto extraído' : 'Ocultar texto bruto';
    });
  }

  /* =========================================================
   * 7. INICIALIZAÇÃO
   * ========================================================= */

  function init() {
    initUploader();
    initManualEditDetection();
    initDeclarationGenerator();
    initEnviarAssinatura();
    initToggleRaw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
