import { describe, it, expect } from 'vitest';
import { UpdateTaskSchema, UpdateDocumentSchema, UpdateProjectSchema } from '../../lib/validation';

const UUID = '00000000-0000-4000-8000-000000000001';

describe('UpdateTaskSchema', () => {
    it('aceita objeto vazio', () => {
        expect(() => UpdateTaskSchema.parse({})).not.toThrow();
    });

    it('aceita campos válidos completos', () => {
        const result = UpdateTaskSchema.parse({
            title: 'Nova tarefa',
            priority: 'high',
            due_date: '2026-01-15',
            status_id: UUID,
            recurrence: 'weekly',
            position: 0,
            assignee_id: UUID,
            category_id: UUID,
        });
        expect(result.title).toBe('Nova tarefa');
        expect(result.priority).toBe('high');
    });

    it('rejeita priority inválida', () => {
        expect(() => UpdateTaskSchema.parse({ priority: 'critical' })).toThrow();
    });

    it('rejeita title vazio (min 1)', () => {
        expect(() => UpdateTaskSchema.parse({ title: '' })).toThrow();
    });

    it('rejeita title com mais de 500 caracteres', () => {
        expect(() => UpdateTaskSchema.parse({ title: 'a'.repeat(501) })).toThrow();
    });

    it('rejeita status_id não-UUID', () => {
        expect(() => UpdateTaskSchema.parse({ status_id: 'nao-uuid' })).toThrow();
    });

    it('campos desconhecidos são ignorados (strip, não strict)', () => {
        // .strict() foi removido — campos extras são silenciosamente descartados
        expect(() => UpdateTaskSchema.parse({ unknown_field: 'x' })).not.toThrow();
    });

    it('aceita assignee_id null', () => {
        expect(() => UpdateTaskSchema.parse({ assignee_id: null })).not.toThrow();
    });

    it('aceita category_id null', () => {
        expect(() => UpdateTaskSchema.parse({ category_id: null })).not.toThrow();
    });

    it('rejeita assignee_id não-UUID', () => {
        expect(() => UpdateTaskSchema.parse({ assignee_id: 'nao-uuid' })).toThrow();
    });

    it('aceita due_date null', () => {
        expect(() => UpdateTaskSchema.parse({ due_date: null })).not.toThrow();
    });

    it('aceita due_date undefined (campo omitido)', () => {
        expect(() => UpdateTaskSchema.parse({})).not.toThrow();
    });

    it('rejeita position negativo', () => {
        expect(() => UpdateTaskSchema.parse({ position: -1 })).toThrow();
    });

    it('aceita position zero', () => {
        expect(() => UpdateTaskSchema.parse({ position: 0 })).not.toThrow();
    });

    it('aceita recurrence none', () => {
        expect(() => UpdateTaskSchema.parse({ recurrence: 'none' })).not.toThrow();
    });

    it('rejeita recurrence inválida', () => {
        expect(() => UpdateTaskSchema.parse({ recurrence: 'hourly' })).toThrow();
    });
});

describe('UpdateDocumentSchema', () => {
    it('aceita título válido', () => {
        expect(() => UpdateDocumentSchema.parse({ title: 'Meu Doc' })).not.toThrow();
    });

    it('aceita project_id null', () => {
        expect(() => UpdateDocumentSchema.parse({ project_id: null })).not.toThrow();
    });

    it('rejeita folder_id não-UUID', () => {
        expect(() => UpdateDocumentSchema.parse({ folder_id: 'invalido' })).toThrow();
    });

    it('aceita folder_id null', () => {
        expect(() => UpdateDocumentSchema.parse({ folder_id: null })).not.toThrow();
    });

    it('aceita parent_id UUID válido', () => {
        expect(() => UpdateDocumentSchema.parse({ parent_id: UUID })).not.toThrow();
    });
});

describe('UpdateProjectSchema', () => {
    it('aceita nome válido', () => {
        expect(() => UpdateProjectSchema.parse({ name: 'Projeto X' })).not.toThrow();
    });

    it('aceita status válido', () => {
        expect(() => UpdateProjectSchema.parse({ status: 'archived' })).not.toThrow();
    });

    it('rejeita status inválido', () => {
        expect(() => UpdateProjectSchema.parse({ status: 'deleted' })).toThrow();
    });

    it('rejeita folder_id não-UUID', () => {
        expect(() => UpdateProjectSchema.parse({ folder_id: 'folder-99' })).toThrow();
    });

    it('aceita folder_id UUID válido', () => {
        expect(() => UpdateProjectSchema.parse({ folder_id: UUID })).not.toThrow();
    });

    it('aceita folder_id null', () => {
        expect(() => UpdateProjectSchema.parse({ folder_id: null })).not.toThrow();
    });

    it('aceita client_id null', () => {
        expect(() => UpdateProjectSchema.parse({ client_id: null })).not.toThrow();
    });

    it('rejeita nome vazio', () => {
        expect(() => UpdateProjectSchema.parse({ name: '' })).toThrow();
    });
});
