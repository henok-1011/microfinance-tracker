import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const next = i18n.language === 'am' ? 'en' : 'am'

  function toggle() {
    void i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('common.switchLanguage')}
      // Both language names are endonyms, so they stay untranslated.
      className="min-h-11 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
    >
      {next === 'am' ? 'አማ' : 'EN'}
    </button>
  )
}
