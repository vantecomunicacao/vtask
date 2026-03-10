import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import OpenAI from "npm:openai@4";
import mjml2html from "npm:mjml@4";

export type TemplateBaseParams = {
  title: string;
  body: string;
  logoUrl?: string;
  bannerUrl?: string;
  bottomImageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  bgColor?: string;
  buttonColor?: string;
};

function renderMjml(mjmlString: string, data: TemplateBaseParams): string {
  const bgColor = data.bgColor || '#f4f4f4';
  const btnColor = data.buttonColor || '#6366f1';

  const logoHtml = data.logoUrl
    ? `<mj-image src="${data.logoUrl}" alt="Logo" width="150px" align="center" padding-bottom="10px" />`
    : '';

  const bannerHtml = data.bannerUrl
    ? `<mj-section padding="0"><mj-column><mj-image src="${data.bannerUrl}" alt="Banner Principal" padding="0" /></mj-column></mj-section>`
    : '';

  const bottomImageHtml = data.bottomImageUrl
    ? `<mj-section padding-top="20px"><mj-column><mj-image src="${data.bottomImageUrl}" alt="Imagem Final" padding="0" /></mj-column></mj-section>`
    : '';

  const buttonHtml = (data.buttonText && data.buttonLink)
    ? `<mj-button href="${data.buttonLink}" background-color="${btnColor}" color="#ffffff" font-weight="bold" border-radius="6px" width="200px" inner-padding="14px 28px">${data.buttonText}</mj-button>`
    : '';

  let resultMjml = mjmlString
    .replace('{{BG_COLOR}}', bgColor)
    .replace('{{BUTTON_COLOR}}', btnColor)
    .replace('{{TITLE}}', data.title)
    .replace('{{BODY_HTML}}', data.body)
    .replace('{{LOGO_HTML}}', logoHtml)
    .replace('{{BANNER_HTML}}', bannerHtml)
    .replace('{{BOTTOM_IMAGE_HTML}}', bottomImageHtml)
    .replace('{{BUTTON_HTML}}', buttonHtml)
    .replaceAll('{{YEAR}}', new Date().getFullYear().toString());

  // @ts-ignore
  const htmlOutput = mjml2html(resultMjml, { minify: true });
  return htmlOutput.html;
}

const tplNewsletter = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica Neue, Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="{{BG_COLOR}}">
    <mj-section background-color="{{BUTTON_COLOR}}" padding="30px">
      <mj-column>
        {{LOGO_HTML}}
        <mj-text align="center" color="#ffffff" font-size="24px" font-weight="bold">{{TITLE}}</mj-text>
      </mj-column>
    </mj-section>
    
    {{BANNER_HTML}}
    
    <mj-section background-color="#ffffff" padding="40px">
      <mj-column>
        <mj-text font-size="16px">
          {{BODY_HTML}}
        </mj-text>
        {{BUTTON_HTML}}
      </mj-column>
    </mj-section>
    
    {{BOTTOM_IMAGE_HTML}}
    
    <mj-section background-color="#f9fafb" padding="20px">
      <mj-column>
        <mj-text align="center" color="#9ca3af" font-size="12px">
          &copy; {{YEAR}} Sua Empresa. Todos os direitos reservados.<br/><br/>
          Você recebeu este e-mail porque se inscreveu em nossa lista.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

const tplComunicado = `
<mjml>
  <mj-body background-color="{{BG_COLOR}}">
    <mj-section background-color="#ffffff" padding="40px" border-top="5px solid {{BUTTON_COLOR}}">
      <mj-column>
        {{LOGO_HTML}}
        <mj-text font-size="22px" font-weight="bold" color="#111827" align="center" padding-bottom="20px">Comunicado Oficial</mj-text>
        <mj-text font-size="16px" color="#374151" line-height="1.8">
          {{BODY_HTML}}
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding-top="30px" padding-bottom="20px" />
        {{BUTTON_HTML}}
      </mj-column>
    </mj-section>
    <mj-section padding="20px">
      <mj-column>
         <mj-text align="center" color="#6b7280" font-size="12px">Enviado por {{YEAR}} Sua Empresa.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

const tplAlerta = `
<mjml>
  <mj-body background-color="{{BG_COLOR}}">
    <mj-section background-color="#ef4444" padding="20px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="14px" font-weight="bold" uppercase="true">Aviso Importante</mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="40px">
      <mj-column>
        {{LOGO_HTML}}
        <mj-text align="center" color="#111827" font-size="24px" font-weight="bold" padding-bottom="20px">⚠️ {{TITLE}}</mj-text>
        {{BANNER_HTML}}
        <mj-text font-size="16px" color="#374151" line-height="1.6" padding-top="20px">
          {{BODY_HTML}}
        </mj-text>
        {{BUTTON_HTML}}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

const tplPromocao = `
<mjml>
  <mj-body background-color="{{BG_COLOR}}">
    <mj-section padding="0">
      <mj-column background-color="#111827" padding="30px">
         {{LOGO_HTML}}
         <mj-text align="center" color="{{BUTTON_COLOR}}" font-size="28px" font-weight="900" text-transform="uppercase">Oferta Especial</mj-text>
      </mj-column>
    </mj-section>
    {{BANNER_HTML}}
    <mj-section background-color="#ffffff" padding="40px">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#111827" align="center">{{TITLE}}</mj-text>
        <mj-text font-size="16px" color="#4b5563" line-height="1.6" align="center" padding-top="15px">
          {{BODY_HTML}}
        </mj-text>
        <mj-spacer height="20px" />
        {{BUTTON_HTML}}
      </mj-column>
    </mj-section>
    {{BOTTOM_IMAGE_HTML}}
  </mj-body>
</mjml>
`;

const tplBoasVindas = `
<mjml>
  <mj-body background-color="{{BG_COLOR}}">
    <mj-section background-color="#ffffff" padding="40px" border-radius="8px">
      <mj-column>
         {{LOGO_HTML}}
         <mj-text align="center" font-size="26px" font-weight="bold" color="{{BUTTON_COLOR}}">Bem-vindo(a)!</mj-text>
         {{BANNER_HTML}}
         <mj-text font-size="16px" color="#374151" line-height="1.7" padding-top="20px">
           {{BODY_HTML}}
         </mj-text>
         <mj-spacer height="20px" />
         {{BUTTON_HTML}}
         <mj-text align="center" font-size="14px" color="#9ca3af" padding-top="30px">Estamos felizes em ter você aqui.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

const INTERNAL_TEMPLATES: Record<string, string> = {
  'newsletter': tplNewsletter,
  'comunicado': tplComunicado,
  'alerta': tplAlerta,
  'promocao': tplPromocao,
  'boas-vindas': tplBoasVindas
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, logoUrl, bannerUrl, bottomImageUrl, buttonText, buttonLink, title, bgColor, buttonColor, internalTemplateId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt é obrigatório' }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um redator especialista em e-mail marketing. Retorne SEMPRE um JSON com as chaves 'subject' (assunto chamativo) e 'body' (corpo do e-mail em HTML responsivo e moderno)."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const emailData = content ? JSON.parse(content) : null;

    if (!emailData) {
      throw new Error("Falha ao gerar conteúdo com a OpenAI");
    }

    const dataObj = {
      title: title || emailData.subject,
      body: emailData.body,
      logoUrl: logoUrl,
      bannerUrl: bannerUrl,
      bottomImageUrl: bottomImageUrl,
      buttonText: buttonText,
      buttonLink: buttonLink,
      bgColor: bgColor,
      buttonColor: buttonColor
    };

    const rawTemplate = INTERNAL_TEMPLATES[internalTemplateId] || INTERNAL_TEMPLATES['newsletter'];
    const fullHtml = renderMjml(rawTemplate, dataObj);

    return new Response(JSON.stringify({
      subject: emailData.subject,
      body: fullHtml
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
