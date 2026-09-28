import type { Category } from './api-client/types';
import type { IconName } from '../components/ui';

// Categories are shown with an icon rather than their `imageUrl` (the seeded images are
// random stock photos that misrepresent the category). The icon is picked by keyword from
// the category's name and slug, so new categories get a sensible icon without code changes.
//
// Rules are checked in order — more specific first (e.g. "non-fiction" before "fiction",
// "wearables" before "electronics"). A keyword matches a whole word or its plural, so
// "laptop" matches "Laptops" and "men" matches "Men's" but "car" doesn't match "Cardigans"
// and "men" doesn't match "Women's". Keywords with a space or hyphen match that phrase.
const RULES: { keywords: string[]; icon: IconName }[] = [
  // Electronics
  { keywords: ['audio', 'headphone', 'earphone', 'speaker', 'sound'], icon: 'headset-outline' },
  { keywords: ['laptop', 'notebook computer'], icon: 'laptop-outline' },
  { keywords: ['computer', 'desktop', 'monitor', 'pc'], icon: 'desktop-outline' },
  { keywords: ['mobile', 'phone', 'smartphone', 'tablet'], icon: 'phone-portrait-outline' },
  { keywords: ['wearable', 'smartwatch', 'watch'], icon: 'watch-outline' },
  { keywords: ['tv', 'television', 'home theatre', 'home theater'], icon: 'tv-outline' },
  { keywords: ['camera', 'photography'], icon: 'camera-outline' },
  { keywords: ['gaming', 'game', 'console'], icon: 'game-controller-outline' },
  { keywords: ['printer', 'print'], icon: 'print-outline' },
  { keywords: ['charger', 'battery', 'power bank', 'powerbank'], icon: 'battery-charging-outline' },
  { keywords: ['electronic', 'gadget', 'tech'], icon: 'hardware-chip-outline' },

  // Fashion
  { keywords: ['footwear', 'shoe', 'sneaker', 'sandal', 'boot'], icon: 'footsteps-outline' },
  { keywords: ['women', 'woman', 'ladies'], icon: 'woman-outline' },
  { keywords: ['men', 'man', 'gents'], icon: 'man-outline' },
  { keywords: ['kid', 'baby', 'toy', 'children'], icon: 'happy-outline' },
  { keywords: ['eyewear', 'sunglass', 'glasses', 'spectacle'], icon: 'glasses-outline' },
  { keywords: ['bag', 'luggage', 'backpack', 'handbag', 'wallet'], icon: 'bag-handle-outline' },
  { keywords: ['jewel', 'jewellery', 'jewelry', 'ring', 'necklace'], icon: 'diamond-outline' },
  { keywords: ['fashion', 'clothing', 'apparel', 'wear', 'shirt', 'dress'], icon: 'shirt-outline' },

  // Home (the combined top-level category keeps the general home icon)
  { keywords: ['home-kitchen', 'home and kitchen'], icon: 'home-outline' },
  { keywords: ['cookware', 'kitchen', 'dining', 'utensil', 'cutlery'], icon: 'restaurant-outline' },
  { keywords: ['furniture', 'bedding', 'bed', 'sofa', 'mattress'], icon: 'bed-outline' },
  { keywords: ['appliance'], icon: 'flash-outline' },
  { keywords: ['lighting', 'lamp', 'light'], icon: 'bulb-outline' },
  { keywords: ['garden', 'plant', 'outdoor living'], icon: 'leaf-outline' },
  { keywords: ['tool', 'hardware', 'diy', 'improvement'], icon: 'hammer-outline' },
  { keywords: ['decor', 'art', 'craft'], icon: 'color-palette-outline' },
  { keywords: ['home'], icon: 'home-outline' },

  // Books & media
  { keywords: ['non-fiction', 'non fiction', 'nonfiction', 'biography', 'self-help'], icon: 'reader-outline' },
  { keywords: ['fiction', 'novel', 'story'], icon: 'book-outline' },
  { keywords: ['comic', 'manga'], icon: 'extension-puzzle-outline' },
  { keywords: ['textbook', 'education', 'academic', 'exam'], icon: 'school-outline' },
  { keywords: ['music', 'instrument'], icon: 'musical-notes-outline' },
  { keywords: ['book', 'stationery'], icon: 'library-outline' },

  // Sports
  { keywords: ['fitness', 'yoga', 'gym', 'exercise', 'workout'], icon: 'barbell-outline' },
  { keywords: ['camping', 'hiking', 'trek', 'trekking'], icon: 'bonfire-outline' },
  { keywords: ['cycling', 'bicycle', 'bike'], icon: 'bicycle-outline' },
  { keywords: ['football', 'soccer'], icon: 'football-outline' },
  { keywords: ['tennis', 'badminton', 'racket'], icon: 'tennisball-outline' },
  { keywords: ['swim', 'water sport'], icon: 'water-outline' },
  { keywords: ['sport', 'athletic'], icon: 'basketball-outline' },

  // Everything else
  { keywords: ['beauty', 'cosmetic', 'makeup', 'skincare', 'personal care'], icon: 'sparkles-outline' },
  { keywords: ['health', 'medical', 'pharmacy', 'wellness'], icon: 'medkit-outline' },
  { keywords: ['grocery', 'food', 'snack', 'gourmet'], icon: 'nutrition-outline' },
  { keywords: ['beverage', 'coffee', 'tea'], icon: 'cafe-outline' },
  { keywords: ['pet', 'dog', 'cat'], icon: 'paw-outline' },
  { keywords: ['automotive', 'car', 'vehicle'], icon: 'car-outline' },
  { keywords: ['gift'], icon: 'gift-outline' },
];

const FALLBACK: IconName = 'pricetag-outline';

export function categoryIcon(category: Pick<Category, 'name' | 'slug'>): IconName {
  const text = `${category.name} ${category.slug}`.toLowerCase().replace(/\s*&\s*/g, ' and ');
  const words = text.split(/[^a-z]+/).filter(Boolean);
  const matches = (keyword: string) =>
    /[\s-]/.test(keyword) ? text.includes(keyword) : words.some((w) => w === keyword || w === `${keyword}s` || w === `${keyword}es`);
  return RULES.find((rule) => rule.keywords.some(matches))?.icon ?? FALLBACK;
}
