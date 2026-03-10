import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import mailchimp from "npm:@mailchimp/mailchimp_marketing@3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { subject, htmlContent } = await req.json();

        if (!subject || !htmlContent) {
            return new Response(JSON.stringify({ error: 'Assunto e conteúdo HTML são obrigatórios' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            });
        }

        mailchimp.setConfig({
            apiKey: Deno.env.get("MAILCHIMP_API_KEY") || "",
            server: Deno.env.get("MAILCHIMP_SERVER_PREFIX") || "us5",
        });

        // 1. Criar a campanha
        const campaignData: any = {
            type: 'regular',
            settings: {
                subject_line: subject,
                reply_to: 'leofbarison@gmail.com', // Usando um genérico aqui, ideal vir do .env
                from_name: 'Vflow Tarefas', // Ou do request
            },
        };

        const campaign = await (mailchimp as any).campaigns.create(campaignData);

        // 2. Adicionar o conteúdo HTML
        await (mailchimp as any).campaigns.setContent(campaign.id, {
            html: htmlContent,
        });

        return new Response(JSON.stringify({ success: true, campaignId: campaign.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
});
