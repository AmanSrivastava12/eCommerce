import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sellerReviewsApi } from './api-client/resources';

// Average of every customer review across all of this seller's products, computed from the
// reviews themselves so it is always current (the cached sellerProfile summary can lag).
export function useSellerRating() {
  const query = useQuery({ queryKey: ['seller-reviews'], queryFn: sellerReviewsApi.list });
  const summary = useMemo(() => {
    const reviews = query.data ?? [];
    const distribution = [0, 0, 0, 0, 0]; // index 0 = 1★ … index 4 = 5★
    let total = 0;
    for (const r of reviews) {
      total += r.rating;
      distribution[Math.min(5, Math.max(1, Math.round(r.rating))) - 1] += 1;
    }
    return { average: reviews.length ? total / reviews.length : 0, count: reviews.length, distribution };
  }, [query.data]);
  return { ...query, summary };
}
