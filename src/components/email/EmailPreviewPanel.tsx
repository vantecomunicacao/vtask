import { useRef, useEffect } from 'react';
import { Smartphone, Monitor, Check, Edit3 } from 'lucide-react';

interface Props {
  result: { subject: string; body: string } | null;
  mobilePreview: boolean;
  setMobilePreview: (v: boolean) => void;
  isEditing: boolean;
  onToggleEditMode: () => void;
  onSaveEdit: (html: string) => void;
  finalSubject: string;
  loading: boolean;
}

export function EmailPreviewPanel({
  result,
  mobilePreview,
  setMobilePreview,
  isEditing,
  onToggleEditMode,
  onSaveEdit,
  finalSubject,
  loading
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Ref síncrono para evitar condição de corrida entre os dois efeitos
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // Recarrega o iframe apenas quando result muda — usa ref para não sobrescrever edições em curso
  useEffect(() => {
    if (result?.body && iframeRef.current && !isEditingRef.current) {
      iframeRef.current.srcdoc = result.body;
    }
  }, [result]); // isEditing via ref — não é dependência do effect

  // Habilita/desabilita edição no iframe
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;

    if (isEditing) {
      doc.body.contentEditable = 'true';
      doc.body.style.outline = 'none';
      doc.body.style.cursor = 'text';
      doc.body.style.boxShadow = 'inset 0 0 0 2px rgba(219,64,53,0.25)';
    } else {
      // Remove atributo ANTES de capturar para não baking contenteditable no HTML salvo
      doc.body.removeAttribute('contenteditable');
      doc.body.style.cursor = '';
      doc.body.style.boxShadow = '';
      const editedHtml = doc.documentElement.outerHTML;
      onSaveEdit(editedHtml);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-surface-2/30">
        <div className="h-24 w-24 bg-surface-card shadow-float rounded-3xl flex items-center justify-center mb-8 border border-border-subtle animate-bounce-subtle">
          <span className="text-4xl text-brand group-hover:scale-110 transition-transform">✉️</span>
        </div>
        <h3 className="text-xl font-bold text-primary mb-3 tracking-tight">Crie sua próxima campanha</h3>
        <p className="text-sm text-secondary max-w-xs leading-relaxed opacity-80">
          Combine o poder da IA com seus templates MJML para gerar e-mails que convertem.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-2/50 backdrop-blur-sm">
      {/* Toolbar Premium */}
      <div className="flex-shrink-0 h-16 bg-surface-card/80 backdrop-blur-md border-b border-border-subtle flex items-center px-6 gap-6 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-brand uppercase font-black tracking-[0.2em] leading-none mb-1.5 opacity-70">Assunto</p>
          <p className="text-sm font-bold text-primary truncate tracking-tight">
             {finalSubject || '(Sem assunto definido)'}
          </p>
        </div>

        <div className="flex items-center bg-surface-2/80 rounded-xl p-1 border border-border-subtle shadow-inner">
          <button 
            onClick={() => setMobilePreview(false)}
            className={`p-2 rounded-lg transition-all duration-300 ${!mobilePreview ? 'bg-surface-card shadow-float text-brand scale-105' : 'text-muted hover:text-secondary'}`}
            title="Desktop View"
          >
            <Monitor size={18} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setMobilePreview(true)}
            className={`p-2 rounded-lg transition-all duration-300 ${mobilePreview ? 'bg-surface-card shadow-float text-brand scale-105' : 'text-muted hover:text-secondary'}`}
            title="Mobile View"
          >
            <Smartphone size={18} strokeWidth={2.5} />
          </button>
        </div>

        <button
          onClick={onToggleEditMode}
          disabled={loading}
          className={`h-10 px-5 rounded-xl text-xs font-black flex items-center gap-2.5 transition-all active:scale-95 border-2 ${
            isEditing 
              ? 'bg-brand text-white border-brand shadow-brand/20' 
              : 'bg-surface-card text-primary border-border-subtle hover:border-brand/30 shadow-sm'
          }`}
        >
          {isEditing ? <><Check size={16} strokeWidth={3} /> SALVAR</> : <><Edit3 size={16} strokeWidth={2.5} /> EDITAR</>}
        </button>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 overflow-auto flex justify-center p-8 custom-scrollbar bg-gradient-to-b from-transparent to-surface-2/20">
        <div className={`bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-top border border-border-subtle overflow-hidden ${
          mobilePreview ? 'w-[375px] h-[667px]' : 'w-full max-w-[720px] min-h-[900px]'
        }`}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Preview do Email"
          />
        </div>
      </div>
    </div>
  );
}
