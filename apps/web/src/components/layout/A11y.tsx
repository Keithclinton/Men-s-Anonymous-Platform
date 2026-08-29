import { useLocale } from '../../lib/i18n';

export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-brass focus:px-4 focus:py-2 focus:text-[14px] focus:text-ink"
    >
      {t.skip}
    </a>
  );
}

export function OfflineBanner() {
  const { t } = useLocale();
  return (
    <div
      data-offline-banner
      hidden
      className="bg-brass/20 px-4 py-2 text-center text-[12px] text-cream"
    >
      {t.offline}
    </div>
  );
}

export function installOfflineListener() {
  function sync() {
    document.querySelectorAll('[data-offline-banner]').forEach((el) => {
      (el as HTMLElement).hidden = navigator.onLine;
    });
  }
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}
