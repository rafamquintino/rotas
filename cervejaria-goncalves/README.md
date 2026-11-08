# Cervejaria Gonçalves: site

Scrollytelling da Cervejaria Gonçalves (Poços de Caldas, desde 2013).

**Stack:** Vite, React, GSAP ScrollTrigger e Lenis. Fonte Archivo (largura variável).

## Rodar

```bash
cd cervejaria-goncalves
npm install
npm run dev      # desenvolvimento
npm run build    # gera o site estático em ../cervejaria
```

## Estrutura

| Seção | Arquivo |
| --- | --- |
| Abertura (selo enchendo + idade) | `src/components/Loader.jsx` |
| Abertura: o miolo amarelo vira o selo | `src/components/Hero.jsx` |
| Manifesto | `src/components/Manifesto.jsx` |
| O elenco (scroll horizontal) | `src/components/Lineup.jsx` |
| Embalagens | `src/components/Packs.jsx` |
| Para o seu negócio + contato | `src/components/Business.jsx` |

Cervejas, textos, cores dos painéis e contatos ficam em `src/data.js` (fonte: Catálogo 2026).
As imagens ficam em `src/assets/`. Para trocar uma garrafa, substitua o arquivo com o mesmo nome.
