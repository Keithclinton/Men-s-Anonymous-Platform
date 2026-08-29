import { useState, type FormEvent } from 'react';
import type { ResourceItem, ResourceType } from '../../api/types';
import { Button } from '../ui/Button';
import { Field, FieldGroup, TextArea } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { parseTags } from '../../lib/resources';

export function ResourceForm({
  existing,
  saving,
  onCancel,
  onSubmit,
}: {
  existing: ResourceItem | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    type: ResourceType;
    title: string;
    body?: string;
    url?: string;
    tags: string[];
    published: boolean;
  }) => void;
}) {
  const [type, setType] = useState<ResourceType>(existing?.type ?? 'ARTICLE');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '));
  const [published, setPublished] = useState(existing?.published ?? true);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (type === 'VIDEO' && !url.trim()) return;
    if (type === 'ARTICLE' && !body.trim() && !url.trim()) return;
    onSubmit({
      type,
      title: title.trim(),
      body: body.trim() || undefined,
      url: url.trim() || undefined,
      tags: parseTags(tags),
      published,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Segmented
        legend="Kind"
        value={type}
        onChange={setType}
        options={[
          { value: 'ARTICLE', label: 'Article', hint: 'Body text' },
          { value: 'VIDEO', label: 'Video', hint: 'Link' },
        ]}
      />
      <FieldGroup>
        <Field
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <TextArea
          label={type === 'VIDEO' ? 'Caption' : 'Body'}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={type === 'VIDEO' ? 'What this is, in a few lines' : 'What members should take away…'}
        />
        <Field
          label={type === 'VIDEO' ? 'Video URL' : 'Link (optional)'}
          name="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          required={type === 'VIDEO'}
          hint={type === 'VIDEO' ? 'YouTube and Vimeo embed on the reader. Other links open out.' : undefined}
        />
        <Field
          label="Tags"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="anonymity, career"
          hint="Comma-separated. Members can filter by these."
        />
      </FieldGroup>
      <label className="flex items-start gap-3 px-1 text-[13px] leading-5 text-mist">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-brass"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published — visible in the member library. Off keeps a draft on this console.
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" loading={saving}>
          {existing ? 'Save' : published ? 'Publish' : 'Save draft'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
