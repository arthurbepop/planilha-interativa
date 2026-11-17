# Treino Hub — Arthur & Isa

Planilha de treino interativa (PWA) para treinar a dois. Programa **Recomeço**: 3 treinos de corpo inteiro por semana, em 3 fases, para perder gordura mantendo a massa magra — adaptado à pressão alta e ao ombro do Arthur e à anemia da Isa.

- **Treino:** registro de repetições por série, sugestão automática de subir carga (dupla progressão), cronômetro de descanso, medição de pressão antes do treino.
- **Progresso:** peso com média de 7 dias, ritmo semanal (% do peso), projeção da meta, cintura e relação cintura/altura.
- **Guia:** fases, cuidados de saúde, princípios, volume semanal, histórico, referências e backup.

Funciona offline e, com login, **sincroniza em tempo real entre os dois celulares** (Firebase).

## Sincronização (Firebase)

- `src/lib/sync.tsx` — login (uma conta do casal, usada nos dois celulares) e coleções sincronizadas. Cada registro é um documento separado em `households/{uid}/{coleção}/{id}`, então edições simultâneas não se sobrescrevem. O cache offline do Firestore guarda tudo sem internet.
- `src/lib/firebase-config.ts` — configuração do app Web do Firebase (valores públicos). Com `null`, o app funciona só no aparelho.
- `firestore.rules` — cada conta só acessa os próprios dados. Cole no Console → Firestore → Regras.
- Teste local com emuladores: `VITE_FIREBASE_EMULATOR=1 npm run build` (Auth na porta 9099, Firestore na 8080).

## Editar os treinos

Tudo está em **`src/data/program.ts`**. Dá para editar direto pelo GitHub (ícone de lápis) — ao salvar no `main`, o site é publicado de novo sozinho.

- `arthur: { sets: 3, load: 70 }` → séries e carga inicial (kg). `sets: 0` esconde o exercício para a pessoa; `load: null` = definir no treino. As séries são limitadas pela fase (`phases`, no fim do arquivo).
- `caution` → alerta de saúde por pessoa; `health` → textos de saúde do Guia.
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
