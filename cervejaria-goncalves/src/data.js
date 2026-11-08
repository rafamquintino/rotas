import lagerG from './assets/lager-growler.webp'
import lager6 from './assets/lager-600.webp'
import pilsG from './assets/pils-growler.webp'
import pils6 from './assets/pils-600.webp'
import dunkelG from './assets/dunkel-growler.webp'
import ipaG from './assets/ipa-growler.webp'
import ipa6 from './assets/ipa-600.webp'
import hop6 from './assets/hoplager-600.webp'

// Linha Gonçalves, conforme o Catálogo 2026.
export const BEERS = [
  {
    n: '01',
    name: 'Lazy Duck',
    kind: 'Lager',
    style: 'Munich Helles',
    abv: '4,4%',
    ibu: '18',
    origin: 'Alemanha',
    text: 'Clássica das cervejas claras de Munique: leve, dourada e muito equilibrada. Aroma sutil de malte, notas levemente adocicadas e amargor baixo, só o suficiente para manter o frescor.',
    packs: ['Growler 1 L', 'Garrafa 600 ml'],
    images: [lagerG, lager6],
    bg: '#FBE14B',
    ink: '#181818',
    accent: '#E3683A',
  },
  {
    n: '02',
    name: 'Better Call Pils',
    kind: 'Pilsen',
    style: 'German Pilsner',
    abv: '5,5%',
    ibu: '35',
    origin: 'Alemanha',
    seasonal: true,
    text: 'Seca, refrescante e com amargor marcante. Mais lupulada que a Pilsen comum, com final limpo e perfil floral e herbal dos lúpulos nobres. Cor de palha brilhante e espuma cremosa.',
    packs: ['Growler 1 L', 'Garrafa 600 ml'],
    images: [pilsG, pils6],
    bg: '#43B08F',
    ink: '#0F1F1A',
    accent: '#F5D23A',
  },
  {
    n: '03',
    name: 'Sweet Soul Sister',
    kind: 'Munich Dunkel',
    style: 'Munich Dunkel',
    abv: '4,4%',
    ibu: '18',
    origin: 'Alemanha',
    text: 'Lager escura da Baviera, castanho-escura com reflexos rubi e espuma cremosa. Malte tostado, pão preto, leve caramelo e nozes. Macia e de final seco.',
    packs: ['Growler 1 L'],
    images: [dunkelG],
    bg: '#6B4C9A',
    ink: '#F6EEDF',
    accent: '#F08A3C',
  },
  {
    n: '04',
    name: 'We Will Hop You',
    kind: 'IPA',
    style: 'American IPA',
    abv: '6,5%',
    ibu: '54',
    origin: 'Estados Unidos',
    text: 'O lúpulo é o protagonista: frutas tropicais, cítricos e resina no aroma. Amargor firme, equilibrado por uma base de malte que dá corpo. Vibrante e de final seco.',
    packs: ['Growler 1 L', 'Garrafa 600 ml'],
    images: [ipaG, ipa6],
    bg: '#EE7B22',
    ink: '#1A0F06',
    accent: '#FBE14B',
  },
  {
    n: '05',
    name: 'Poços de Caldas',
    kind: 'Hop Lager',
    style: 'Hop Lager',
    abv: '4,4%',
    ibu: '18',
    origin: 'Alemanha',
    text: 'Lager leve e refrescante com um toque moderno de lúpulos cultivados nas terras de Poços de Caldas. Notas cítricas e florais marcantes, descomplicada e cheia de personalidade.',
    packs: ['Garrafa 600 ml'],
    images: [hop6],
    bg: '#74C4E4',
    ink: '#0E1C24',
    accent: '#F5C832',
  },
]

export const CONTACT = {
  whatsapp: '5535991058436',
  whatsappLabel: '(35) 99105-8436',
  email: 'rafael.quintino@cervejariagoncalves.com.br',
  instagram: 'cervejariagoncalves',
  site: 'www.cervejariagoncalves.com.br',
}

export const wa = (msg) => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`
