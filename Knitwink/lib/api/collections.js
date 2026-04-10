

export function applyFiltersAndSort(
products,
filter,
status,
sort)
{
  let result = [...products];

  if (filter) {
    result = result.filter((p) =>
    p.collectionName.toLowerCase().includes(filter) ||
    p.materials.some((m) => m.toLowerCase().includes(filter))
    );
  }

  if (status) {
    result = result.filter((p) => p.badge?.toLowerCase() === status);
  }

  switch (sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      // assume id ordering reflects recency
      result.reverse();
      break;
    case 'bestselling':
      result = result.filter((p) => p.badge === 'Bestseller').concat(
        result.filter((p) => p.badge !== 'Bestseller')
      );
      break;
  }

  return result;
}