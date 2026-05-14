import { z } from 'zod';

const uuid = z.string().uuid();
const shortText = z.string().min(1).max(500);
const longText = z.string().max(50_000);

export const UpdateTaskSchema = z.object({
    title: shortText.optional(),
    description: longText.optional(),
    status_id: uuid.optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().nullable().optional(),
    assignee_id: uuid.nullable().optional(),
    category_id: uuid.nullable().optional(),
    position: z.number().int().min(0).optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
});

// content é excluído da validação — é JSON gerado internamente pelo Tiptap, não input do usuário
export const UpdateDocumentSchema = z.object({
    title: z.string().max(500).optional(),
    project_id: uuid.nullable().optional(),
    parent_id: uuid.nullable().optional(),
    folder_id: uuid.nullable().optional(),
});

export const UpdateProjectSchema = z.object({
    name: shortText.optional(),
    description: longText.optional(),
    color: z.string().max(20).optional(),
    status: z.enum(['active', 'archived', 'completed']).optional(),
    folder_id: uuid.nullable().optional(),
    client_id: uuid.nullable().optional(),
});
