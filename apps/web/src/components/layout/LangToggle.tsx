import { useLocale } from '../../lib/i18n';

export function LangToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      aria-label={locale === 'en' ? 'Switch to Kiswahili' : 'Switch to English'}
      onClick={() => setLocale(locale === 'en' ? 'sw' : 'en')}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line/80 bg-surface/50 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-mist transition hover:border-mist/40 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
    >
      {locale === 'en' ? 'SW' : 'EN'}
    </button>
  );
}
