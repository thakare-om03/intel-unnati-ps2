/**
 * Collection of fallback images for different topics
 * This ensures we have consistent, nice-looking placeholders when API requests fail
 */
const FALLBACK_IMAGES = {
  nature: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600",
  space: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600",
  animals: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef3?w=600",
  ocean: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600",
  mountains:
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600",
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600",
  city: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=600",
  food: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600",
  technology:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
  science: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600",
  history: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600",
  art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600",
};

/**
 * Default categories to match topics that don't have specific images
 */
const CATEGORY_KEYWORDS = {
  ocean: ["sea", "beach", "water", "marine", "fish", "underwater"],
  space: ["galaxy", "stars", "planets", "astronomy", "cosmos", "universe"],
  animals: ["wildlife", "pets", "zoo", "cat", "dog", "bird"],
  nature: ["landscape", "flowers", "trees", "plants", "garden"],
  mountains: ["hiking", "peaks", "valley", "hill", "climbing"],
  city: ["urban", "buildings", "skyline", "streets", "architecture"],
};

/**
 * Get a placeholder image for a given topic
 * @param {string} topic - The topic to find an image for
 * @returns {string} - URL to a placeholder image
 */
export const getPlaceholderImage = (topic) => {
  if (!topic) return "https://via.placeholder.com/600x400?text=No+Topic";

  const normalizedTopic = topic.toLowerCase().trim();

  // Direct match in our fallback images
  if (FALLBACK_IMAGES[normalizedTopic]) {
    return FALLBACK_IMAGES[normalizedTopic];
  }

  // Check if the topic matches any category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalizedTopic.includes(keyword))) {
      return FALLBACK_IMAGES[category];
    }
  }

  // If no match is found, use a generic placeholder with the topic text
  return `https://via.placeholder.com/600x400?text=${encodeURIComponent(
    topic
  )}`;
};

export default FALLBACK_IMAGES;
