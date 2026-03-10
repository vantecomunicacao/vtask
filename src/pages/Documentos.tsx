import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/ui/Button';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import { Search, FileText, Plus, Calendar, Folder, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Documentos() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { activeWorkspace } = useWorkspaceStore();
    const { documents, fetchDocuments, createDocument, deleteDocument, loading } = useDocumentStore();
    const { projects } = useProjectStore();

    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState('all');

    useEffect(() => {
        if (activeWorkspace) {
            fetchDocuments(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchDocuments]);

    const handleCreateDocument = async () => {
        if (!activeWorkspace) return;

        const newDoc = await createDocument({
            workspace_id: activeWorkspace.id,
            title: 'Novo Documento',
            content: { type: 'doc', content: [] },
            project_id: selectedProject === 'all' ? null : selectedProject
        });

        if (newDoc) {
            navigate(`/documentos/${newDoc.id}`);
        }
    };

    const handleDeleteDocument = async (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        if (window.confirm(`Tem certeza que deseja excluir o documento "${title}"?`)) {
            await deleteDocument(id);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
        const matchesProject = selectedProject === 'all' || doc.project_id === selectedProject;
        return matchesSearch && matchesProject;
    });

    return (
        <div className="space-y-6 fade-in h-full flex flex-col relative">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
                    <p className="text-sm text-gray-500">Crie e organize manuais, briefings e anotações.</p>
                </div>
                <Button onClick={handleCreateDocument} className="gap-2">
                    <Plus size={18} /> Novo Documento
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* Filtros */}
                <div className="p-4 border-b border-border-subtle flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar documentos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none w-64 transition-all"
                            />
                        </div>

                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="all">Todos os Projetos</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Lista de Documentos */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText size={32} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">Nenhum documento encontrado</p>
                            <p className="text-sm text-gray-400 mt-1">Comece criando seu primeiro documento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDocuments.map(doc => {
                                const project = projects.find(p => p.id === doc.project_id);
                                return (
                                    <div
                                        key={doc.id}
                                        onClick={() => navigate(`/documentos/${doc.id}`)}
                                        className="group bg-white border border-border-subtle rounded-xl p-5 hover:border-brand hover:shadow-lg transition-all cursor-pointer flex flex-col h-48"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                                <FileText size={20} />
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteDocument(e, doc.id, doc.title)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Excluir documento"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors line-clamp-2 mb-auto">
                                            {doc.title}
                                        </h3>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                {format(new Date(doc.updated_at!), 'dd MMM', { locale: ptBR })}
                                            </div>
                                            {project && (
                                                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                    <Folder size={10} />
                                                    <span className="truncate max-w-[80px]">{project.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {id && <DocumentEditor documentId={id} onClose={() => navigate('/documentos')} />}
        </div>
    );
}
