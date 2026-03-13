---
description: Sincronização de Banco de Dados (SQLite p/ Supabase)
---

Este fluxo de trabalho deve ser seguido SEMPRE que houver mudanças na estrutura do banco de dados (novas tabelas, novas colunas ou alterações de tipos).

### 1. Detecção de Mudança
- Ao criar uma nova tabela no `db.cjs` ou adicionar uma coluna via `ALTER TABLE`.

### 2. Atualização do Supabase (Nuvem)
- Acesse o Dashboard do Supabase.
- No **SQL Editor**, aplique o comando SQL correspondente à mudança feita no SQLite.
- *Dica:* Mantenha os tipos de dados compatíveis (ex: TEXT no SQLite -> TEXT no Postgres, INTEGER -> BIGINT).

### 3. Atualização do Servidor (Backup Automático)
- Abra o arquivo `server.cjs`.
- Localize a constante `tablesToBackup`.
- Se for uma **tabela nova**, adicione o nome da tabela no array.
- Se for uma **coluna nova**, o sistema detectará automaticamente no próximo `upsert`, desde que a coluna já exista no Supabase.

### 4. Atualização dos Scripts de Manutenção
- Adicione a nova tabela (se houver) nos seguintes arquivos:
  - `backup_supabase.cjs`: No array `tables`.
  - `restore_supabase.cjs`: No array `tables`.
  - `check_sync.cjs`: No array `tables`.
  - `wipe_local.cjs`: No array `tables`.

### 5. Verificação de Integridade
- Execute `node check_sync.cjs` para garantir que a nova estrutura está espelhando os dados corretamente.
- Verifique o log do servidor para garantir que o backup automático não está retornando erros de "schema cache".

---
// turbo-all
// Esta regra deve ser consultada pela IA em todas as modificações de banco de dados.
