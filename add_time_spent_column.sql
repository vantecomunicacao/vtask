-- Adicionar coluna de tempo gasto na tabela de tarefas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent NUMERIC DEFAULT 0;

-- Comentário opcional para documentação
COMMENT ON COLUMN tasks.time_spent IS 'Tempo total gasto na tarefa em horas';
