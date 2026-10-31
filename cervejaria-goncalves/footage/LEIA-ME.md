# Roteiro de filmagem (celular)

Coloque os vídeos nesta pasta com o **nome da cena** (ex.: `hero.mp4`) e rode `npm run film`.
Os brutos não vão para o git; só a versão preparada em `public/film/`.

## Regras para todas as cenas

- **Celular deitado (horizontal)**, 4K ou 1080p, **60 fps**.
- **Tripé ou apoio firme.** Nada de câmera na mão.
- **Assunto no centro do quadro.** No celular, o site recorta o meio do vídeo em formato vertical.
- **Trave foco e exposição** (no iPhone, toque e segure na tela; no Android, use o modo Pro).
- **8 a 15 segundos** por cena, sem cortes e sem áudio (o som é removido).
- Luz de lado ou por trás do copo faz a cerveja brilhar. Evite luz de frente e flash.

## Cenas que precisam ser da marca (você grava)

| Arquivo | O que filmar | Dica |
| --- | --- | --- |
| `hero.mp4` | Sua tulipa cheia de chope, parada, bolhas subindo | **Fundo totalmente preto** (tecido preto atrás, luz só no copo). O título aparece "atrás" do copo onde o fundo é escuro. Loop: o começo e o fim devem ser parecidos. |
| `mergulho.mp4` | Seu chope sendo tirado na chopeira, bem de perto | Câmera lenta (120 ou 240 fps). O scroll controla esse vídeo, então o movimento precisa ser contínuo. |
| `fermentacao.mp4` | Seus tanques: visor, válvula, espuma de fermentação, vapor | Movimento lento de câmera ou algo se mexendo no quadro. |
| `bar.mp4` | Sua tulipa e suas 3 garrafas 600 ml numa mesa de bar, luzes desfocadas ao fundo | Final do site: o texto de clientes fica por cima, à esquerda, então deixe o produto mais para a direita. |

## Cenas que podem vir de banco gratuito (eu baixo)

| Arquivo | O que é |
| --- | --- |
| `lager.mp4` | Bolhas em macro num líquido dourado e límpido |
| `ipa.mp4` | Bolhas num líquido cobre (opcional: sem ele, uso a Lager com filtro de cor) |
| `weiss.mp4` | Cerveja turva de trigo (opcional, mesmo esquema) |
| `malte.mp4` | Grãos de malte caindo ou sendo revolvidos |
| `lupulo.mp4` | Cones de lúpulo verde |
| `espuma.mp4` | Espuma subindo em macro (controlada pelo scroll) |

Se você conseguir gravar alguma dessas na fábrica (malte, lúpulo, espuma no copo), melhor ainda: substitui a do banco.

## Cortes

Para aproveitar só um trecho, crie `cortes.json`:

```json
{ "hero": { "inicio": 2.5, "duracao": 8 } }
```
