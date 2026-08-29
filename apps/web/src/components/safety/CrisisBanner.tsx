import { Link } from 'react-router-dom';
import { useLocale } from '../../lib/i18n';

export function CrisisBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <aside
      className={
        compact
          ? 'border-b border-danger/25 bg-danger/10 px-4 py-2 text-[12px] leading-5 text-cream'
          : 'rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] leading-5 text-cream'
      }
    >
      <p className="font-medium">{t.crisisTitle}</p>
      <p className="mt-1 text-mist">{t.crisisBody}</p>
      {!compact ? (
        <p className="mt-2 text-[12px] text-mist">
          <Link to="/privacy" className="underline decoration-line underline-offset-4">
            {t.privacy}
          </Link>
          {' · '}
          <Link to="/terms" className="underline decoration-line underline-offset-4">
            {t.terms}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
