## 墨 Resumo do Pull Request

Descreva de forma clara e objetiva o que este Pull Request adiciona, melhora ou corrige no `@sumi-forge/react`.

---

## Tipo de Alteração

- [ ] `feat` · Novo componente, pincel, coreografia ou efeito visual
- [ ] `fix` · Correção de bug ou ajuste de layout/responsividade
- [ ] `perf` · Otimização de renderização Canvas / Cache Offscreen (60/120 FPS)
- [ ] `docs` · Atualização de documentação, README ou exemplos

---

## Componentes Afetados

- [ ] `<SumiLandscape />` (Paisagem Procedural Monte Fuji & Sakura)
- [ ] `<SumiMaskReveal />` (Revelação de Imagens a Pincel / Toque)
- [ ] `<SumiBrushCanvas />` (Atelier de Pintura com Pressão)
- [ ] `<SumiSectionPainter />` (Pintura Viva de Seções no Scroll)
- [ ] `<SumiVFX />` (Estúdio de Efeitos 16 Quadros / GIF89a)
- [ ] `<SumiButton />` / `<SumiIcon />` / `<JapaneseCalligraphy />`
- [ ] Landing Page / Playground Studio / Documentação

---

## Checklist de Qualidade & Performance

- [ ] `npm run lint` (`tsc --noEmit`) executou sem nenhum erro.
- [ ] `npm run build` compilou sem avisos ou falhas.
- [ ] Testado em **Mobile** (toque simples e arraste com `touch-action: none`), **Tablet** e **Desktop**.
- [ ] Todos os ícones e bordas utilizam `roughjs` em estética Sumi-e (sem bibliotecas externas de ícones).
- [ ] As animações mantêm 60/120 FPS sem causar re-renders desnecessários no React.

---

## Capturas de Tela / Demonstração (Desktop & Mobile)

<!-- Adicione imagens ou GIFs demonstrando o comportamento no Desktop e no Celular -->
