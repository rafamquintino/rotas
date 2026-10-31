// ⚠️ PLACEHOLDERS: troque pelos dados reais da cervejaria.
export const CONFIG = {
  whatsapp: '5535999999999', // DDI + DDD + número, só dígitos
  whatsappMsg:
    'Olá! Vim pelo site da Cervejaria Gonçalves e quero levar a cerveja de vocês para o meu estabelecimento.',
  instagram: 'https://instagram.com/cervejariagoncalves',
  endereco: 'Rua Exemplo, 000, Bairro, Poços de Caldas, MG',
  mapsUrl: 'https://maps.google.com/?q=Poços+de+Caldas+MG',
}

export const waLink = (msg = CONFIG.whatsappMsg) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`
