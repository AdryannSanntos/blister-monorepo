export const brandProfileFixtures = {
  basic: {
    brandVoice:
      'Friendly and approachable. We speak directly to small business owners.',
    niche: 'Marketing Digital',
    description: 'A small digital marketing agency',
    targetAudience: 'Small business owners in Brazil',
    marketingObjective: 'Increase brand awareness and engagement',
  },
  complete: {
    brandVoice:
      'Professional yet warm. We balance expertise with accessibility.',
    niche: 'Confeitaria Artesanal',
    description:
      'Handmade cakes and sweets with premium ingredients. Family recipes passed down through generations.',
    targetAudience:
      'Women 25-45 who appreciate quality homemade products for special occasions',
    marketingObjective:
      'Build loyal customer base and increase repeat orders',
    mainProducts: 'Bolos decorados, doces finos, tortas especiais',
    differentiators:
      'Ingredientes premium, receitas de família, atendimento personalizado',
    socialNetworks: ['instagram', 'whatsapp'],
    palette: {
      primary: '#E91E63',
      secondary: '#FFC107',
      accent: '#4CAF50',
    },
    typography: {
      headings: 'Playfair Display',
      body: 'Open Sans',
    },
    visualStyle: 'Warm and inviting, rustic elegance',
  },
  minimal: {
    brandVoice: 'Direct and clear.',
    niche: 'Tecnologia',
  },
};

export type BrandProfileFixture = keyof typeof brandProfileFixtures;

export function getBrandProfileFixture(name: BrandProfileFixture) {
  return brandProfileFixtures[name];
}
