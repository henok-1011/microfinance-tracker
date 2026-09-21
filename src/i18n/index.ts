import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import am from '@/i18n/am.json'
import en from '@/i18n/en.json'

const storedLanguage = localStorage.getItem('lang')

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: storedLanguage ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
