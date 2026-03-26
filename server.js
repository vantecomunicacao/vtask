import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import mailchimp from '@mailchimp/mailchimp_marketing';
import mjml2html from 'mjml';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3001; // New port definition

// Configuração de CORS restrita
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Middleware de Autenticação para proteger as rotas da API
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const secret = process.env.SERVER_SECRET;

  // Se o secret não estiver configurado no server, bloqueia preventivamente
  if (!secret) {
    console.error('SERVER_SECRET não está configurado no servidor!');
    return res.status(500).json({ error: 'Erro de configuração no servidor' });
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token inválido ou ausente.' });
  }

  next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
const SERVER_API_KEY = process.env.SERVER_API_KEY || "";

function requireApiKey(req, res, next) {
  if (!SERVER_API_KEY) {
    // Key not configured — skip validation (useful during initial setup)
    console.warn('⚠️  SERVER_API_KEY não configurado — rotas sem autenticação');
    return next();
  }
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== SERVER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Calcula a próxima execução com base na expressão cron (min hour dom month dow)
function calcNextRun(cronExpr) {
  const parts = (cronExpr || '').split(' ');
  if (parts.length !== 5) return new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [min, hour, dom, , dow] = parts;
  const minute = parseInt(min) || 0;
  const hourNum = parseInt(hour) || 9;

  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hourNum, minute, 0, 0);

  if (dom !== '*') {
    // Mensal: dia específico do mês
    const targetDay = parseInt(dom);
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDay);
    }
  } else if (dow !== '*') {
    // Semanal: dia específico da semana (0=Dom, 1=Seg, ...)
    const targetDow = parseInt(dow);
    const currentDow = now.getDay();
    let daysUntil = (targetDow - currentDow + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
  } else {
    // Diário
    if (next <= now) next.setDate(next.getDate() + 1);
  }

  return next;
}

// Chaves via variáveis de ambiente para segurança
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const MAILCHIMP_KEY = process.env.MAILCHIMP_API_KEY || "";
const MAILCHIMP_PREFIX = process.env.MAILCHIMP_PREFIX || "us5";

// Supabase (service role — substitua pelas suas chaves)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const openai = new OpenAI({ apiKey: OPENAI_KEY });
mailchimp.setConfig({ apiKey: MAILCHIMP_KEY, server: MAILCHIMP_PREFIX });

// --- Lógica de MJML Completa ---
const INTERNAL_TEMPLATES = {
  'newsletter': `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}" padding="24px 0">
    <mj-wrapper border-radius="16px" padding="0">
      <mj-section background-color="{{HEADER_COLOR}}" padding="32px 30px">
        <mj-column>
          {{LOGO_HTML}}
          <mj-text align="center" color="{{TITLE_COLOR}}" font-size="24px" font-weight="bold">{{TITLE}}</mj-text>
        </mj-column>
      </mj-section>
      {{BANNER_HTML}}
      <mj-section background-color="#ffffff" padding="40px">
        <mj-column>
          <mj-text font-size="16px">{{BODY_HTML}}</mj-text>
          {{BUTTON_HTML}}
        </mj-column>
      </mj-section>
      {{BOTTOM_IMAGE_HTML}}
      <mj-section background-color="#f9fafb" padding="24px">
        <mj-column>
          <mj-text align="center" color="#9ca3af" font-size="12px">{{FOOTER_HTML}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>`,
  'comunicado': `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}" padding="24px 0">
    <mj-wrapper border-radius="16px" padding="0">
      <mj-section background-color="#ffffff" padding="40px" border-top="5px solid {{HEADER_COLOR}}">
        <mj-column>
          {{LOGO_HTML}}
          <mj-text font-size="22px" font-weight="bold" color="#111827" align="center" padding-bottom="20px">Comunicado Oficial</mj-text>
          <mj-text font-size="16px" color="#374151" line-height="1.8">{{BODY_HTML}}</mj-text>
          <mj-divider border-color="#e5e7eb" border-width="1px" padding-top="30px" padding-bottom="20px" />
          {{BUTTON_HTML}}
        </mj-column>
      </mj-section>
      <mj-section background-color="#f9fafb" padding="24px">
        <mj-column>
          <mj-text align="center" color="#9ca3af" font-size="12px">{{FOOTER_HTML}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>`,
  'promocao': `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}" padding="24px 0">
    <mj-wrapper border-radius="16px" padding="0">
      <mj-section background-color="#111827" padding="30px">
        <mj-column>
          {{LOGO_HTML}}
          <mj-text align="center" color="{{HEADER_COLOR}}" font-size="28px" font-weight="900" text-transform="uppercase">Oferta Especial</mj-text>
        </mj-column>
      </mj-section>
      {{BANNER_HTML}}
      <mj-section background-color="#ffffff" padding="40px">
        <mj-column>
          <mj-text font-size="20px" font-weight="bold" color="#111827" align="center">{{TITLE}}</mj-text>
          <mj-text font-size="16px" color="#4b5563" line-height="1.6" align="center" padding-top="15px">{{BODY_HTML}}</mj-text>
          <mj-spacer height="20px" />
          {{BUTTON_HTML}}
        </mj-column>
      </mj-section>
      {{BOTTOM_IMAGE_HTML}}
      <mj-section background-color="#f9fafb" padding="24px">
        <mj-column>
          <mj-text align="center" color="#9ca3af" font-size="12px">{{FOOTER_HTML}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>`,
  'alerta': `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}" padding="24px 0">
    <mj-wrapper border-radius="16px" padding="0">
      <mj-section background-color="#ef4444" padding="20px">
        <mj-column>
          <mj-text align="center" color="#ffffff" font-size="14px" font-weight="bold">⚠️ Aviso Importante</mj-text>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="40px">
        <mj-column>
          {{LOGO_HTML}}
          <mj-text align="center" color="#111827" font-size="24px" font-weight="bold" padding-bottom="20px">{{TITLE}}</mj-text>
          {{BANNER_HTML}}
          <mj-text font-size="16px" color="#374151" line-height="1.6" padding-top="20px">{{BODY_HTML}}</mj-text>
          {{BUTTON_HTML}}
        </mj-column>
      </mj-section>
      <mj-section background-color="#f9fafb" padding="24px">
        <mj-column>
          <mj-text align="center" color="#9ca3af" font-size="12px">{{FOOTER_HTML}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>`,
  'boas-vindas': `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}" padding="24px 0">
    <mj-wrapper border-radius="16px" padding="0">
      <mj-section background-color="#ffffff" padding="40px">
        <mj-column>
          {{LOGO_HTML}}
          <mj-text align="center" font-size="26px" font-weight="bold" color="{{HEADER_COLOR}}">Bem-vindo(a)! 🎉</mj-text>
          {{BANNER_HTML}}
          <mj-text font-size="16px" color="#374151" line-height="1.7" padding-top="20px">{{BODY_HTML}}</mj-text>
          <mj-spacer height="20px" />
          {{BUTTON_HTML}}
        </mj-column>
      </mj-section>
      <mj-section background-color="#f9fafb" padding="24px">
        <mj-column>
          <mj-text align="center" color="#9ca3af" font-size="12px">{{FOOTER_HTML}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  </mj-body>
</mjml>`
};

// Retorna '#ffffff' ou '#111827' dependendo da luminância do hex
function contrastColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  // Luminância relativa (fórmula WCAG)
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.5 ? '#111827' : '#ffffff';
}

function renderMjml(mjmlString, data) {
  const bgColor = data.bgColor || '#f4f4f4';
  const btnColor = data.buttonColor || '#db4035';
  const headerColor = data.headerColor || btnColor;
  const titleColor = contrastColor(headerColor);
  const year = new Date().getFullYear().toString();
  const companyName = data.companyName || 'Sua Empresa';

  const logoHtml = data.logoUrl ? `<mj-image src="${data.logoUrl}" alt="Logo" width="150px" align="center" padding-bottom="10px" />` : '';
  const bannerHtml = data.bannerUrl ? `<mj-section padding="0"><mj-column padding="0"><mj-image src="${data.bannerUrl}" alt="Banner" padding="0" fluid-on-mobile="true" /></mj-column></mj-section>` : '';
  const bottomImageHtml = data.bottomImageUrl ? `<mj-section padding="0"><mj-column padding="0"><mj-image src="${data.bottomImageUrl}" alt="Fim" padding="0" fluid-on-mobile="true" /></mj-column></mj-section>` : '';
  const buttonHtml = (data.buttonText && data.buttonLink) ? `<mj-button href="${data.buttonLink}" target="_blank" background-color="${btnColor}" color="#ffffff" font-weight="bold" border-radius="8px" width="220px" font-size="16px" inner-padding="15px 30px">${data.buttonText}</mj-button>` : '';
  const footerHtml = `&copy; ${year} ${companyName}. Todos os direitos reservados.<br/><br/>Você recebeu este e-mail porque se inscreveu em nossa lista.${data.unsubscribeUrl ? `<br/><a href="${data.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Cancelar inscrição</a>` : ''}`;

  let resultMjml = mjmlString
    .replace(/{{BG_COLOR}}/g, bgColor)
    .replace(/{{BUTTON_COLOR}}/g, btnColor)
    .replace(/{{HEADER_COLOR}}/g, headerColor)
    .replace(/{{TITLE_COLOR}}/g, titleColor)
    .replace(/{{TITLE}}/g, data.title || '')
    .replace(/{{BODY_HTML}}/g, data.body || '')
    .replace(/{{LOGO_HTML}}/g, logoHtml)
    .replace(/{{BANNER_HTML}}/g, bannerHtml)
    .replace(/{{BOTTOM_IMAGE_HTML}}/g, bottomImageHtml)
    .replace(/{{BUTTON_HTML}}/g, buttonHtml)
    .replace(/{{FOOTER_HTML}}/g, footerHtml)
    .replace(/{{YEAR}}/g, year);

  // Inject preview text (inbox snippet) — always present
  const previewTag = `<mj-preview>${data.previewText || ''}</mj-preview>`;
  if (resultMjml.includes('<mj-head>')) {
    resultMjml = resultMjml.replace('<mj-head>', `<mj-head>${previewTag}`);
  } else {
    resultMjml = resultMjml.replace('<mjml>', `<mjml><mj-head>${previewTag}</mj-head>`);
  }

  return mjml2html(resultMjml).html;
}

// --- ROTAS ---

app.post('/api/generate-email', requireAuth, async (req, res) => {
  try {
    const { prompt, internalTemplateId, title, bgColor, buttonColor, headerColor, logoUrl, bannerUrl, bottomImageUrl, buttonText, buttonLink, previewText, clientContext, profileName, openaiApiKey, ctaEnabled = true, emailLength = 'medium' } = req.body;
    const ai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : openai;

    const lengthGuide = { short: '~150 palavras, objetivo e direto', medium: '~300 palavras, equilibrado', long: '~500 palavras, detalhado e aprofundado' }[emailLength] || '~300 palavras';
    const ctaRule = ctaEnabled
      ? '6. Ao final do body, escreva um parágrafo de texto persuasivo que incentive o clique no botão. NUNCA inclua elementos HTML de botão, link (<a href>), ou qualquer outro elemento clicável no body — o botão será adicionado automaticamente pelo template.'
      : '6. NÃO inclua chamada para ação (CTA), links, botões nem elementos <a> no corpo do email.';

    const response = await ai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um Copywriter e Especialista em E-mail Marketing de alto nível. O seu objetivo é escrever e-mails altamente criativos, engajadores e que convertem. Você receberá 'Instruções da Empresa' (contexto fixo) e o 'Tema do E-mail' (conteúdo atual).\n\nSiga estas regras:\n1. Use as Instruções da Empresa para manter o tom de voz e informações institucionais (Nome, E-mail, CTA, etc).\n2. Desenvolva o conteúdo focado integralmente no Tema do E-mail fornecido.\n3. Use storytelling, gatilhos mentais e empatia.\n4. Estruture o texto com ritmo fluido usando HTML básico (<br><br> para parágrafos, <strong> para destaque, <h2>/<h3> para subtítulos).\n5. Tamanho do corpo: ${lengthGuide}.\n${ctaRule}\n7. Retorne SEMPRE um JSON estrito com 3 campos: 'subject' (assunto irresistível, máx 60 chars), 'preview' (texto de prévia para inbox, máx 130 chars — complementa o assunto sem repetir), e 'body' (corpo persuasivo em HTML).`
        },
        {
          role: "user",
          content: `INSTRUÇÕES DA EMPRESA:\n${clientContext || "Nenhuma instrução adicional."}\n\nTEMA DO E-MAIL PARA ESCREVER AGORA:\n${prompt}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const emailData = JSON.parse(response.choices[0].message.content);
    // Remove any <a> tags the AI may have included in the body (button is rendered by template)
    emailData.body = (emailData.body || '').replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
    const finalPreview = previewText || emailData.preview || '';

    const rawTemplate = INTERNAL_TEMPLATES[internalTemplateId] || INTERNAL_TEMPLATES['newsletter'];
    const fullHtml = renderMjml(rawTemplate, {
      title: title || emailData.subject,
      body: emailData.body,
      bgColor,
      buttonColor,
      headerColor,
      logoUrl,
      bannerUrl,
      bottomImageUrl,
      buttonText: ctaEnabled ? buttonText : null,
      buttonLink: ctaEnabled ? buttonLink : null,
      previewText: finalPreview,
      companyName: profileName,
    });

    res.json({ subject: emailData.subject, preview: finalPreview, body: fullHtml });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-campaign', requireAuth, async (req, res) => {
  try {
    const { subject, htmlContent, listId, previewText, scheduleTime, apiKey, serverPrefix, fromName, replyTo } = req.body;
    if (apiKey && serverPrefix) {
      mailchimp.setConfig({ apiKey, server: serverPrefix });
    }
    const campaign = await mailchimp.campaigns.create({
      type: 'regular',
      recipients: listId ? { list_id: listId } : undefined,
      settings: {
        subject_line: subject,
        preview_text: previewText || '',
        reply_to: replyTo || 'teste@teste.com',
        from_name: fromName || 'Vflow Local',
      },
    });
    await mailchimp.campaigns.setContent(campaign.id, { html: htmlContent });
    if (scheduleTime) {
      await mailchimp.campaigns.schedule(campaign.id, { schedule_time: scheduleTime });
    }
    res.json({ success: true, campaignId: campaign.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    mailchimp.setConfig({ apiKey: MAILCHIMP_KEY, server: MAILCHIMP_PREFIX });
  }
});

app.get('/api/mailchimp-lists', requireAuth, async (_req, res) => {
  try {
    const data = await mailchimp.lists.getAllLists({ count: 50 });
    res.json({ lists: data.lists.map(l => ({ id: l.id, name: l.name, count: l.stats.member_count })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suggest-subject', requireAuth, async (req, res) => {
  try {
    const { prompt, title, clientContext, openaiApiKey } = req.body;
    const ai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : openai;
    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um Copywriter especialista em e-mail marketing focado em taxas de abertura. Seu objetivo é criar assuntos e textos de prévia altamente criativos. Use o contexto da empresa para manter a coerência e foque no tema do e-mail para despertar curiosidade. Retorne APENAS um JSON com { "subject": "...", "preview": "..." } (subject máx 60 e preview máx 130 caracteres).',
        },
        {
          role: 'user',
          content: `Contexto da Empresa: ${clientContext || "N/A"}\nTema do E-mail/Ideia: ${prompt || title}`
        },
      ],
      response_format: { type: 'json_object' },
    });
    const data = JSON.parse(response.choices[0].message.content);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listas Mailchimp de um cliente específico
app.post('/api/client-mailchimp-lists', requireAuth, async (req, res) => {
  try {
    const { apiKey, server } = req.body;
    if (!apiKey || !server) return res.status(400).json({ error: 'apiKey e server são obrigatórios' });

    mailchimp.setConfig({ apiKey, server });
    const data = await mailchimp.lists.getAllLists({ count: 50 });

    // Retornar as chaves padrão
    mailchimp.setConfig({ apiKey: MAILCHIMP_KEY, server: MAILCHIMP_PREFIX });

    res.json({ lists: data.lists.map(l => ({ id: l.id, name: l.name, count: l.stats.member_count })) });
  } catch (error) {
    mailchimp.setConfig({ apiKey: MAILCHIMP_KEY, server: MAILCHIMP_PREFIX });
    res.status(500).json({ error: error.message });
  }
});

// Sugestão de Temas com IA
app.post('/api/suggest-themes', requireApiKey, async (req, res) => {
  try {
    const { clientContext } = req.body;
    const now = new Date();
    const monthName = now.toLocaleString('pt-BR', { month: 'long' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um estrategista de conteúdo. Sugira 3 ideias curtas e criativas (bullet points) de temas para e-mail marketing baseados no mês atual, datas comemorativas próximas e no contexto da empresa. Seja direto.',
        },
        {
          role: 'user',
          content: `Mês Atual: ${monthName} de ${now.getFullYear()}\nContexto da Empresa: ${clientContext || "N/A"}`
        },
      ],
    });
    res.json({ suggestions: response.choices[0].message.content });
  } catch (error) {
    console.error('Erro na IA:', error);
    res.status(500).json({ error: 'Erro ao gerar temas', details: error.message });
  }
});

// --- Agendamentos automáticos ---

async function runScheduledEmail(schedule, profile) {
  mailchimp.setConfig({ apiKey: profile.mailchimp_api_key, server: profile.mailchimp_server });

  let finalTheme = schedule.prompt_override || "Newsletter Semanal";

  // Lógica de IA Orquestradora (Consumo de Fila)
  if (schedule.is_dynamic_theme) {
    const themesList = profile.themes_list ? profile.themes_list.split('\n').filter(t => t.trim().length > 0) : [];

    if (themesList.length > 0) {
      finalTheme = themesList[0].trim(); // Pega o primeiro da fila
      themesList.shift(); // Remove o primeiro da fila

      // Salva a nova lista de volta no banco
      const updatedThemes = themesList.join('\n');
      if (supabaseAdmin) {
        await supabaseAdmin.from('email_profiles').update({ themes_list: updatedThemes }).eq('id', profile.id);
      }
    } else {
      const now = new Date();
      const monthName = now.toLocaleString('pt-BR', { month: 'long' });
      finalTheme = `Tema criativo e engajador inspirado no mês de ${monthName}`;
    }
    console.log(`🤖 IA Orquestradora escolheu o tema: ${finalTheme}`);
  }

  try {
    // 1. Gerar conteúdo
    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um Copywriter de alto nível. Escreva e-mails criativos baseados nas "Instruções da Empresa" e no "Tema do E-mail" fornecidos. Use HTML básico e tom persuasivo. Retorne JSON com "subject" e "body".',
        },
        {
          role: 'user',
          content: `INSTRUÇÕES DA EMPRESA:\n${profile.ai_prompt || "N/A"}\n\nTEMA DO E-MAIL:\n${finalTheme}`
        },
      ],
      response_format: { type: 'json_object' },
    });
    const emailData = JSON.parse(aiRes.choices[0].message.content);

    // 2. Renderizar MJML
    const rawTemplate = INTERNAL_TEMPLATES[schedule.template_id] || INTERNAL_TEMPLATES['newsletter'];
    const html = renderMjml(rawTemplate, {
      title: emailData.subject,
      body: emailData.body,
      bgColor: schedule.bg_color || '#f4f4f4',
      buttonColor: schedule.button_color || profile.brand_color || '#db4035',
      logoUrl: profile.logo_url,
      buttonText: schedule.button_text,
      buttonLink: schedule.button_link,
    });

    // 3. Criar campanha no Mailchimp
    const campaign = await mailchimp.campaigns.create({
      type: 'regular',
      recipients: profile.mailchimp_list_id ? { list_id: profile.mailchimp_list_id } : undefined,
      settings: {
        subject_line: emailData.subject,
        from_name: profile.sender_name || profile.name,
        reply_to: profile.sender_email || 'noreply@example.com',
      },
    });
    await mailchimp.campaigns.setContent(campaign.id, { html });

    // 4. Se tiver e-mail de teste configurado no perfil, enviar disparo de teste
    if (profile.test_email) {
      try {
        await mailchimp.campaigns.sendTestEmail(campaign.id, {
          test_emails: [profile.test_email],
          send_type: 'html'
        });
        console.log(`✉️ E-mail de teste enviado para ${profile.test_email} (Campanha: ${campaign.id})`);
      } catch (testErr) {
        console.error(`⚠️ Falha ao enviar e-mail de teste para ${profile.test_email}:`, testErr.message);
      }
    }

    return { campaignId: campaign.id, subject: emailData.subject };
  } finally {
    // Retornar as chaves padrão caso outro processo do servidor precise em seguida
    mailchimp.setConfig({ apiKey: MAILCHIMP_KEY, server: MAILCHIMP_PREFIX });
  }
}

// Cron: verifica agendamentos a cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
  if (!supabaseAdmin) return;
  const now = new Date().toISOString();

  const { data: schedules } = await supabaseAdmin
    .from('email_schedules')
    .select('*, profile:email_profiles(*)')
    .eq('active', true)
    .lte('next_run_at', now)
    .limit(50);

  if (!schedules || schedules.length === 0) return;

  for (const schedule of schedules) {
    const profile = schedule.profile;
    if (!profile?.mailchimp_api_key) continue;

    let success = false;
    let subject = null;
    let campaignId = null;
    let errorMessage = null;

    try {
      const result = await runScheduledEmail(schedule, profile);
      success = true;
      subject = result.subject;
      campaignId = result.campaignId;
      console.log(`✅ Agendamento "${schedule.name}" executado — campanha ${campaignId}`);
    } catch (err) {
      errorMessage = err.message;
      console.error(`❌ Agendamento "${schedule.name}" falhou:`, err.message);
    }

    // Calcular próxima execução com base na expressão cron do agendamento
    const cronParts = schedule.cron_expression.split(' ');
    const nextRun = new Date(now);
    const dayOfMonth = cronParts[2];
    const dayOfWeek = cronParts[4];
    
    if (dayOfWeek !== '*') {
      nextRun.setDate(nextRun.getDate() + 7);
    } else if (dayOfMonth !== '*') {
      if (dayOfMonth.includes(',')) {
        nextRun.setDate(nextRun.getDate() + 14);
      } else {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    } else {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    await supabaseAdmin.from('email_schedules').update({
      last_run_at: now,
      next_run_at: nextRun.toISOString(),
    }).eq('id', schedule.id);

    await supabaseAdmin.from('email_schedule_history').insert({
      schedule_id: schedule.id,
      ran_at: now,
      success,
      subject,
      campaign_id: campaignId,
      error_message: errorMessage,
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`));
