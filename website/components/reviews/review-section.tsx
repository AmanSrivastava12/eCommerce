'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api-client/resources';
import { ApiError } from '@/lib/api-client/client';
import { useAuthStore } from '@/lib/stores/auth-store';

export function ReviewSection({ productId, sku }: { productId: string; sku: string }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', productId, sku],
    queryFn: () => productsApi.reviews(productId, sku),
  });

  const submit = useMutation({
    mutationFn: () => productsApi.submitReview(productId, { sku, rating, comment }),
    onSuccess: () => {
      setComment('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['reviews', productId, sku] });
    },
    onError: (err) => {
      // Distinguishes "not logged in" from "haven't purchased this variant" per the
      // backend's two separate 403 reasons, so the message matches what actually happened.
      if (err instanceof ApiError) {
        setFormError(String((err.body as any)?.message ?? 'Could not submit review'));
      }
    },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-[var(--foreground)]">Reviews</h2>
      <div className="space-y-3">
        {(reviews ?? []).map((review) => (
          <div key={review._id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
            <p className="font-medium text-[var(--foreground)]">
              ★ {review.rating} {review.title && `– ${review.title}`}
            </p>
            <p className="mt-1 text-[var(--muted)]">{review.comment}</p>
          </div>
        ))}
        {reviews && reviews.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No reviews yet for this variant.</p>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        {!isLoggedIn ? (
          <p className="text-sm text-[var(--muted)]">Sign in to write a review.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
            className="space-y-3"
          >
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 outline-none focus:border-[var(--brand)]"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this exact variant…"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-sm outline-none focus:border-[var(--brand)]"
              rows={3}
            />
            {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}
            <button
              type="submit"
              disabled={submit.isPending}
              className="rounded-md bg-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
            >
              {submit.isPending ? 'Submitting…' : 'Submit review'}
            </button>
            <p className="text-xs text-[var(--muted)]">
              You can only review a product variant after receiving it in a completed order.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
