import type { IngredientId } from '../../shared/protocol';

export const biryaniStory = {
  heading: 'What made this bowl rich',
  ingredients: [
    { id: 'rice', title: 'Rice', description: 'Rice absorbed stock, fat and spices. Regional biryanis still use different aromatic grains, giving each its own texture.', sources: ['https://www.goya.in/blog/a-mughal-amba-pulao-from-the-kitchens-of-shah-jahan', 'https://www.indianhealthyrecipes.com/thalassery-chicken-biryani-recipe/'] },
    { id: 'saffron', title: 'Saffron', description: 'Saffron brought golden colour and fragrance. Some modern recipes use colouring, recreating the appearance without the same aroma.', sources: ['https://www.sahapedia.org/the-history-of-biryani', 'https://www.indianhealthyrecipes.com/chicken-biryani-recipe/'] },
    { id: 'protein', title: 'Meat', description: 'Cooking meat with rice brought their flavours together. Mughal manuscripts also record fish and paneer preparations: variation already belonged to the tradition.', sources: ['https://www.sahapedia.org/the-history-of-biryani'] },
    { id: 'onions', title: 'Onions', description: 'Browning onions developed sweetness and deeper flavour. This familiar foundation remains in many biryanis today.', sources: ['https://www.sahapedia.org/the-history-of-biryani', 'https://www.seriouseats.com/lamb-biryani'] },
    { id: 'spices', title: 'Spices', description: 'Cinnamon, cloves, cardamom and cumin built layers of fragrance. Modern recipes often combine these whole spices with ground masalas and chilli.', sources: ['https://www.sahapedia.org/the-history-of-biryani', 'https://www.indianhealthyrecipes.com/chicken-biryani-recipe/'] },
    { id: 'herbs', title: 'Herbs', description: 'Fresh herbs add fragrance. Mint and coriander are familiar today, although their exact match to this historical recipe is uncertain.', sources: ['https://m.thewire.in/article/history/the-mughal-feast-book-excerpt', 'https://www.indianhealthyrecipes.com/chicken-biryani-recipe/'] },
    { id: 'nuts', title: 'Nuts and dried fruit', description: 'Some courtly rice dishes included almonds, pistachios and raisins for contrasting textures and sweetness. Today, garnishes vary between recipes.', sources: ['https://www.goya.in/blog/a-mughal-amba-pulao-from-the-kitchens-of-shah-jahan', 'https://www.seriouseats.com/lamb-biryani'] },
    { id: 'ghee', title: 'Ghee', description: 'Ghee added buttery richness between the layers. It remains in use, while some modern preparations use oil or a mixture of both.', sources: ['https://www.goya.in/blog/a-mughal-amba-pulao-from-the-kitchens-of-shah-jahan', 'https://www.bbcgoodfood.com/recipes/low-fat-chicken-biryani'] },
  ] satisfies { id: IngredientId | 'ghee'; title: string; description: string; sources: string[] }[],
};
