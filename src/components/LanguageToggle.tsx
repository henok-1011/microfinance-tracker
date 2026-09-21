import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const next = i18n.language === 'am' ? 'en' : 'am'

  function toggle() {
    void i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
    >
      {next === 'am' ? 'አማ' : 'EN'}
    </button>
  )
}
