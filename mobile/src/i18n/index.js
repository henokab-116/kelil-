import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import base from './strings.base';
import extra from './strings.extra';
import { store } from '../storage';

export const LANGUAGES = [
  { code: 'am', name: 'አማርኛ' },
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Afaan Oromoo' },
  { code: 'ti', name: 'ትግርኛ' },
  { code: 'so', name: 'Soomaali' },
  { code: 'sid', name: 'Sidaamu Afoo' }
];

const merged = {};
for (const code of new Set([...Object.keys(base), ...Object.keys(extra)])) {
  merged[code] = { ...(base[code] || {}), ...(extra[code] || {}) };
}
const lookup = (lang, k) => (merged[lang] && merged[lang][k]) || merged.en[k];

const Ctx = createContext({ t: (k) => k, has: () => false, lang: 'am', setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('am');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store.get('tp_lang').then((l) => { if (l && merged[l]) setLangState(l); }).finally(() => setReady(true));
  }, []);

  const setLang = useCallback((l) => { if (merged[l]) { setLangState(l); store.set('tp_lang', l); } }, []);
  const value = useMemo(() => ({
    lang, setLang,
    has: (k) => !!lookup(lang, k),
    t: (k, vars) => {
      let s = lookup(lang, k) || k;
      if (vars) for (const v in vars) s = s.replace(`{${v}}`, vars[v]);
      return s;
    }
  }), [lang, setLang]);

  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
