export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            document_folders: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    parent_id: string | null
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    parent_id?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    name?: string
                    parent_id?: string | null
                }
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    role: 'admin' | 'editor' | 'viewer'
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'admin' | 'editor' | 'viewer'
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'admin' | 'editor' | 'viewer'
                }
            }
            workspaces: {
                Row: {
                    id: string
                    name: string
                    logo_url: string | null
                    color: string | null
                    created_at: string
                    openai_api_key: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    logo_url?: string | null
                    color?: string | null
                    openai_api_key?: string | null
                }
                Update: {
                    name?: string
                    logo_url?: string | null
                    color?: string | null
                    openai_api_key?: string | null
                }
            }
            workspace_members: {
                Row: {
                    workspace_id: string
                    user_id: string
                    role: 'owner' | 'admin' | 'member'
                    created_at: string
                }
                Insert: {
                    workspace_id: string
                    user_id: string
                    role?: 'owner' | 'admin' | 'member'
                }
                Update: {
                    role?: 'owner' | 'admin' | 'member'
                }
            }
            clients: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    logo_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    logo_url?: string | null
                }
                Update: {
                    name?: string
                    logo_url?: string | null
                }
            }
            email_clients: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    mailchimp_api_key: string | null
                    mailchimp_prefix: string | null
                    custom_prompt: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    mailchimp_api_key?: string | null
                    mailchimp_prefix?: string | null
                    custom_prompt?: string | null
                }
                Update: {
                    name?: string
                    mailchimp_api_key?: string | null
                    mailchimp_prefix?: string | null
                    custom_prompt?: string | null
                }
            }
            projects: {
                Row: {
                    id: string
                    workspace_id: string
                    client_id: string | null
                    name: string
                    description: string | null
                    color: string | null
                    icon: string | null
                    status: 'active' | 'archived' | 'completed'
                    start_date: string | null
                    due_date: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    client_id?: string | null
                    name: string
                    description?: string | null
                    color?: string | null
                    icon?: string | null
                    status?: 'active' | 'archived' | 'completed'
                    start_date?: string | null
                    due_date?: string | null
                }
                Update: {
                    client_id?: string | null
                    name?: string
                    description?: string | null
                    color?: string | null
                    icon?: string | null
                    status?: 'active' | 'archived' | 'completed'
                    start_date?: string | null
                    due_date?: string | null
                }
            }
            custom_statuses: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    color: string
                    position: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    color: string
                    position: number
                }
                Update: {
                    name?: string
                    color?: string
                    position?: number
                }
            }
            task_categories: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    color: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    color?: string | null
                    created_at?: string
                }
                Update: {
                    workspace_id?: string
                    name?: string
                    color?: string | null
                }
            }
            tasks: {
                Row: {
                    id: string
                    project_id: string
                    parent_id: string | null
                    title: string
                    description: string | null
                    assignee_id: string | null
                    status_id: string | null
                    priority: 'low' | 'medium' | 'high' | 'urgent'
                    position: number
                    start_date: string | null
                    due_date: string | null
                    time_estimate: number | null
                    labels: string[] | null
                    recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null
                    category_id: string | null
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    project_id: string
                    parent_id?: string | null
                    title: string
                    description?: string | null
                    assignee_id?: string | null
                    status_id?: string | null
                    priority?: 'low' | 'medium' | 'high' | 'urgent'
                    position?: number
                    start_date?: string | null
                    due_date?: string | null
                    time_estimate?: number | null
                    labels?: string[] | null
                    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null
                    category_id?: string | null
                    deleted_at?: string | null
                }
                Update: {
                    project_id?: string
                    parent_id?: string | null
                    title?: string
                    description?: string | null
                    assignee_id?: string | null
                    status_id?: string | null
                    priority?: 'low' | 'medium' | 'high' | 'urgent'
                    position?: number
                    start_date?: string | null
                    due_date?: string | null
                    time_estimate?: number | null
                    labels?: string[] | null
                    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null
                    category_id?: string | null
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            comments: {
                Row: {
                    id: string
                    task_id: string
                    user_id: string
                    content: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    user_id: string
                    content: string
                    created_at?: string
                }
                Update: {
                    content?: string
                }
            }
            task_attachments: {
                Row: {
                    id: string
                    task_id: string
                    user_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    user_id: string
                    file_name: string
                    file_path: string
                    file_size: number
                    file_type: string
                    created_at?: string
                }
                Update: {
                    task_id?: string
                    user_id?: string
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    file_type?: string
                }
            }
            documents: {
                Row: {
                    id: string
                    workspace_id: string
                    project_id: string | null
                    folder_id: string | null
                    parent_id: string | null
                    title: string
                    content: Json | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    project_id?: string | null
                    folder_id?: string | null
                    parent_id?: string | null
                    title: string
                    content?: Json | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    workspace_id?: string
                    project_id?: string | null
                    folder_id?: string | null
                    parent_id?: string | null
                    title?: string
                    content?: Json | null
                    created_by?: string | null
                    updated_at?: string
                    deleted_at?: string | null
                }
            }
            task_documents: {
                Row: {
                    id: string
                    task_id: string
                    document_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    document_id: string
                    created_at?: string
                }
                Update: {
                    task_id?: string
                    document_id?: string
                }
            }
        }
    }
}