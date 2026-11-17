# Treino Hub — Arthur & Isa

Planilha de treino interativa (PWA) para treinar a dois: cargas, séries, cronômetro de descanso e histórico, tudo salvo no celular e funcionando offline.

## Editar os treinos

Tudo está em **`src/data/program.ts`**. Dá para editar direto pelo GitHub (ícone de lápis) — ao salvar no `main`, o site é publicado de novo sozinho.

- `arthur: { sets: 4, load: 14 }` → séries e carga inicial (kg). `sets: 0` esconde o exercício para a pessoa; `load: null` = definir no treino.
- `reps`, `rir`, `rest` (segundos), `step` (incremento do botão +/−).
- `how`, `avoid`, `why`, `notes` → textos da ficha do exercício.
- **Não mude o `id`** de um exercício existente: é ele que liga as cargas e o histórico salvos.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` compila e publica a cada push no `main` (também dá para rodar manualmente em *Actions → Publicar no GitHub Pages → Run workflow*).

Funciona com a configuração atual do Pages ("Deploy from a branch"): o workflow espera o build automático do GitHub terminar e publica o app compilado por cima. Opcional, para deixar só uma publicação por push: *Settings → Pages → Source: GitHub Actions*.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · vite-plugin-pwa (offline). Fontes Barlow / JetBrains Mono embutidas.
