import { useState, type FormEvent } from 'react';
import { submitFeedback } from '../../api/feedback';
import { ApiError } from '../../api/errors';
import type { Feedback } from '../../api/types';
import { Button } from './Button';
import { Field, FieldGroup } from './Field';
import { Notice } from './Notice';
import { Panel } from '../layout/Panel';
import { cn } from '../../lib/cn';

export function FeedbackForm({
  sessionId,
  existing,
  onSubmitted,
}: {
  sessionId: string;
  existing?: Feedback | null;
  onSubmitted: (feedback: Feedback) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (existing) {
    return (
      <Panel className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Feedback</p>
        <p className="mt-2 text-[14px] text-cream">
          You rated this {existing.rating}/5
          {existing.comment ? ` — “${existing.comment}”` : '.'}
        </p>
      </Panel>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const feedback = await submitFeedback(sessionId, {
        rating,
        comment: comment.trim() || undefined,
      });
      onSubmitted(feedback);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t submit feedback.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Feedback</p>
      <p className="mt-2 text-[13px] text-mist">Rate this session. Your identity stays a handle.</p>
      {error ? (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={cn(
                'size-10 rounded-full border text-[14px]',
                rating === n
                  ? 'border-brass/70 bg-surface-2 text-cream'
                  : 'border-line text-mist hover:text-cream',
              )}
              aria-label={`Rate ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
        <FieldGroup>
          <Field
            label="Comment (optional)"
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What helped?"
          />
        </FieldGroup>
        <Button type="submit" loading={submitting}>
          Submit feedback
        </Button>
      </form>
    </Panel>
  );
}
