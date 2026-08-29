import type { ResourceItem } from '../../api/types';
import { formatWhen } from '../../lib/format';
import { videoEmbedUrl } from '../../lib/resources';

export function ResourceReader({ item }: { item: ResourceItem }) {
  const embed = item.type === 'VIDEO' ? videoEmbedUrl(item.url) : null;

  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.14em] text-sage">{item.type}</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight text-cream">{item.title}</h2>
      {item.tags.length > 0 ? (
        <p className="mt-2 text-[12px] text-mist">{item.tags.join(' · ')}</p>
      ) : null}
      <p className="mt-1 text-[12px] text-mist">{formatWhen(item.updatedAt ?? item.createdAt)}</p>

      {embed ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-ink">
          <iframe
            title={item.title}
            src={embed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      ) : null}

      {item.body ? (
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-mist">{item.body}</p>
      ) : null}

      {item.url && !embed ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-12 items-center text-[14px] text-brass underline decoration-line underline-offset-4"
        >
          Open link
        </a>
      ) : null}
    </article>
  );
}
