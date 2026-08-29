import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'sw';

const STORAGE = 'map.locale';

const copy = {
  en: {
    crisisTitle: 'This is not emergency care',
    crisisBody:
      'If you are in immediate danger, call emergency services. In Kenya: Befrienders 0722 178 177 · Red Cross 1199 · GBV 1195.',
    skip: 'Skip to content',
    offline: 'You’re offline. Some actions will wait until you’re back.',
    terms: 'Terms',
    privacy: 'Privacy',
    how: 'How it works',
    faq: 'FAQ',
    forProviders: 'For counselors',
    account: 'Account',
    signOut: 'Sign out',
    notifications: 'Notifications',
    menu: 'Menu',
    lang: 'English',
  },
  sw: {
    crisisTitle: 'Hii si huduma ya dharura',
    crisisBody:
      'Ukiwa hatarini sasa, piga simu ya dharura. Kenya: Befrienders 0722 178 177 · Red Cross 1199 · GBV 1195.',
    skip: 'Nenda kwenye maudhui',
    offline: 'Huna mtandao. Baadhi ya vitendo vitasubiri.',
    terms: 'Masharti',
    privacy: 'Faragha',
    how: 'Jinsi inavyofanya kazi',
    faq: 'Maswali',
    forProviders: 'Kwa washauri',
    account: 'Akaunti',
    signOut: 'Toka',
    notifications: 'Arifa',
    menu: 'Menyu',
    lang: 'Kiswahili',
  },
} as const;

type Dict = (typeof copy)[Locale];

const LocaleContext = createContext<{
  locale: Locale;
  t: Dict;
  setLocale: (locale: Locale) => void;
} | null>(null);

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE);
    if (stored === 'sw' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE, next);
      document.documentElement.lang = next === 'sw' ? 'sw' : 'en';
    } catch {
      /* ignore */
    }
  };
  const value = useMemo(() => ({ locale, t: copy[locale], setLocale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
