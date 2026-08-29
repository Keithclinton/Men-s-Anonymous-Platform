import { useMemo, useState } from 'react';
import type { AvailabilitySlot } from '../../api/types';
import { cn } from '../../lib/cn';
import { formatWhen } from '../../lib/format';

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

export function SlotCalendar({
  slots,
  selectedId = null,
  onSelect,
}: {
  slots: AvailabilitySlot[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const key = dayKey(slot.start);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()].map(([, list]) => list.sort((a, b) => a.start.localeCompare(b.start)));
  }, [slots]);

  const [dayIndex, setDayIndex] = useState(0);
  const day = grouped[Math.min(dayIndex, Math.max(grouped.length - 1, 0))] ?? [];

  if (slots.length === 0) {
    return <p className="text-[13px] leading-5 text-mist">No open slots in this window.</p>;
  }

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {grouped.map((list, index) => (
          <button
            key={list[0].id}
            type="button"
            onClick={() => setDayIndex(index)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-2 text-[13px]',
              index === dayIndex ? 'bg-brass text-ink' : 'border border-line text-mist',
            )}
          >
            {dayLabel(list[0].start)}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {day.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect?.(slot.id)}
            disabled={!onSelect}
            className={
              selectedId === slot.id
                ? 'min-h-12 rounded-xl border border-brass/60 bg-surface-2 px-3 py-2 text-left text-[13px] text-cream'
                : 'min-h-12 rounded-xl border border-line px-3 py-2 text-left text-[13px] text-mist disabled:opacity-100'
            }
          >
            <span className="block text-cream">{formatWhen(slot.start).split(',').slice(-1)[0]?.trim()}</span>
            <span className="text-[11px] text-mist">
              {slot.bookingId ? 'Booked' : `${slot.durationMin} min`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
