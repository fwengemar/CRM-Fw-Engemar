# CRM FW Engemar

Sistema interno de gestão de contratos e tarefas da FW Construções e Serviços Marítimos LTDA.

## O que é

Aplicação web (React + Vite) com banco e autenticação no Supabase, publicada na Vercel.
Cobre o ciclo de contratos públicos — da análise do edital ao encerramento — e as tarefas
operacionais ligadas a cada contrato.

## Módulos

**Contratos** — Tabela agrupada por fase, quadro kanban, timeline de vigências e dashboard
de indicadores (carteira contratada, pipeline em disputa, vigências a vencer, próximas sessões).
Cada contrato guarda medições, aditivos, conversa da equipe e histórico de alterações.

**Tarefas** — Minhas tarefas (agrupadas por urgência), quadro kanban e calendário mensal.
Cada tarefa tem subtarefas, checklist, comentários, histórico, recorrência e dependência.
Ao mudar a fase de um contrato, as tarefas padrão daquela fase são criadas automaticamente.

## Estrutura

```
src/
  lib.js            constantes, cliente Supabase e utilitários
  ui.jsx            componentes visuais compartilhados
  views.jsx         telas de contrato (tabela, kanban, timeline, dashboard)
  tarefas.jsx       telas de tarefa (minhas, quadro, calendário)
  drawer.jsx        painel lateral do contrato
  tarefa-drawer.jsx painel lateral da tarefa
  App.jsx           autenticação, navegação e carregamento de dados
```

## Banco (Supabase)

Tabelas: `perfis`, `contratos`, `medicoes`, `aditivos`, `tarefas`, `checklist_itens`,
`modelos_tarefa`, `comentarios`, `atividades`.

RLS ativo em todas: apenas usuários autenticados leem e escrevem. Gatilhos cuidam do log de
atividades, da geração da próxima ocorrência de tarefas recorrentes e da criação das tarefas
padrão a cada mudança de fase.

## Rodar localmente

```bash
npm install
npm run dev
```

As credenciais públicas do Supabase têm valor padrão em `src/lib.js` e podem ser
sobrescritas por `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Como publicar uma alteração

O código vive em duas cópias sincronizadas: esta pasta no computador da equipe e o
repositório `fwengemar/CRM-Fw-Engemar` no GitHub. O fluxo é:

1. A alteração é escrita nos arquivos desta pasta
2. `git add -A && git commit -m "descrição" && git push`
3. A Vercel detecta o commit na branch `main` e publica em fw-contratos.vercel.app

Nunca commitar `node_modules/` nem `dist/` — o `.gitignore` já cuida disso.
