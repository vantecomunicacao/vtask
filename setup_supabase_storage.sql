-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-images', 'document-images', true)
ON CONFLICT (id) DO NOTHING;

-- Garantir que o bucket é público para leitura
UPDATE storage.buckets
SET public = true
WHERE id = 'document-images';

-- Políticas de RLS para o bucket document-images
-- 1. Permitir visualização pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'document-images' );

-- 2. Permitir upload para usuários autenticados
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'document-images' );

-- 3. Permitir deleção para usuários autenticados (opcional, mas recomendado)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'document-images' );
