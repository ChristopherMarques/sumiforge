# Guia de Contribuição · `@sumi-forge/react` (貢献)

Obrigado pelo seu interesse em contribuir com o **SumiForge (`@sumi-forge/react`)**!  
Nosso objetivo é manter uma biblioteca React leve, extremamente fluida (60/120 FPS) e visualmente autêntica, inspirada nas técnicas tradicionais de pintura japonesa.

---

## Como Contribuir

1. **Faça um Fork** do repositório e crie sua branch a partir da `main`:
   ```bash
   git checkout -b feat/novo-pincel-oriental
   ```
2. **Instale as dependências** e execute o ambiente local:
   ```bash
   npm install
   npm run dev
   ```
3. **Teste em Desktop, Tablet e Mobile**:
   - Verifique se a pintura por toque (`touch-action: none` e toque simples) funciona suavemente em telas menores.
   - Certifique-se de que as animações mantêm 60/120 FPS utilizando cache offscreen quando necessário.
4. **Valide o código antes do commit**:
   ```bash
   npm run lint
   npm run build
   ```

---

## Diretrizes de Design e Código

### 1. Estética e Coerência Visual
- **Papel Washi & Contraste**: Todo texto sobre áreas pintadas deve usar containers com glassmorphismo suave (`bg-[#F8F4EC]/82 backdrop-blur-xl`) para garantir leitura cristalina.
- **Ícones e Bordas**: Não utilize bibliotecas de ícones genéricas. Todos os ícones (`<SumiIcon />`) e botões (`<SumiButton />`) devem ser desenhados com `roughjs` em traço de nanquim monocromático (`#11100E`).
- **Ideogramas Japoneses**: Sempre que adicionar um selo ou termo em japonês com `<JapaneseCalligraphy />`, forneça a leitura `romaji` e uma tradução poética e positiva em Português Brasileiro (`pt`).

### 2. Performance (60/120 FPS)
- Evite atualizar estados React (`useState`) a cada frame de rolagem ou movimento de ponteiro. Prefira `useRef` combinados com `requestAnimationFrame`.
- Camadas estáticas ou já finalizadas devem ser cacheadas em um `<canvas>` offscreen para evitar recalcular milhares de cerdas por segundo.
- Utilize `IntersectionObserver` para pausar loops de animação quando o componente estiver fora da área visível da tela.

---

## Padrão de Commits

Utilizamos o padrão **Conventional Commits**:

- `feat:` nova funcionalidade, pincel ou coreografia (ex: `feat(mask): adiciona modo pintar do zero no mobile`)
- `fix:` correção de bug ou ajuste de responsividade (ex: `fix(atelier): corrige escala dos traços iniciais no celular`)
- `perf:` melhoria de performance e FPS (ex: `perf(landscape): adiciona cache offscreen para o Monte Fuji`)
- `docs:` alterações em documentação, README ou templates

---

## Abrindo um Pull Request

Preencha todos os campos do nosso [Template de Pull Request](./.github/PULL_REQUEST_TEMPLATE.md), incluindo capturas de tela (Desktop e Mobile) quando houver mudanças visuais.

---

*made with love in Japa.... ops, Brazil*
