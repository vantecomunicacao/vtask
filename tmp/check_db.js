
const SUPABASE_URL = 'https://koaxkjsmkjwzsodnzowf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYXhranNta2p3enNvZG56b3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzIwNTgsImV4cCI6MjA4MDI0ODA1OH0.ugj0HWPTIf3VL9KszDuIDbxzQfltnRcchjR8RS3Uja0';

async function checkColumns() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/email_profiles?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        if (data.length > 0) {
            console.log('Colunas encontradas:', Object.keys(data[0]));
        } else {
            console.log('Nenhum perfil encontrado para verificar colunas.');
        }
    } catch (error) {
        console.error('Erro ao verificar colunas:', error);
    }
}

checkColumns();
