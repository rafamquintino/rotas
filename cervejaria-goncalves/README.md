# Cervejaria Gonçalves: site imersivo

Site de scroll cinematográfico em 3D. A câmera mergulha no copo, atravessa as bolhas, passa pelos três estilos e pelo processo, sobe até a espuma e termina numa mesa de bar.

**Stack:** Vite, React, React Three Fiber, drei, GSAP ScrollTrigger e Lenis.

## Rodar

```bash
cd cervejaria-goncalves
npm install
npm run dev      # desenvolvimento
npm run build    # gera o site estático em ../cervejaria
```

O build sai em `/cervejaria` na raiz do repositório, com caminhos relativos, então funciona em qualquer subpasta (GitHub Pages, Netlify, hospedagem comum).

## Onde editar

| O quê | Arquivo |
| --- | --- |
| WhatsApp, Instagram, endereço, mapa | `src/lib/config.js` |
| Textos, ABV e IBU dos estilos | `src/lib/beers.js` |
| Pontos de venda, segmentos e etapas do processo | `src/components/Sections.jsx` (`PLACES`, `SEGMENTS`, `STEPS`) |
| Logo (placeholder) | `LogoMark` em `src/components/Sections.jsx` e `glassPrintTexture` / `labelTexture` em `src/three/textures.js` |
| Cores e tipografia | `src/styles.css` (`:root`) |

## Desempenho

`src/lib/device.js` classifica o aparelho em `high`, `mid`, `low` ou `none` (sem WebGL), usando núcleos, memória, GPU, economia de dados e movimento reduzido. Partículas, transmissão do vidro, antialias e resolução escalam com isso, e o `PerformanceMonitor` rebaixa o nível se o FPS cair. Para testar um nível, use `?tier=low` na URL.

Sem WebGL, o site mostra um copo em SVG e mantém todo o conteúdo.
