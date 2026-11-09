import React from 'react';
import { Chips } from './UI';
import { LANGUAGES, useI18n } from '../i18n';

export default function LanguagePicker() {
  const { lang, setLang } = useI18n();
  return <Chips options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))} value={lang} onChange={setLang} />;
}
