import { describe, expect, it } from 'vitest'

import { isPhoneValid, normalizePhone, phoneToAuthEmail } from '@/lib/phone'

describe('normalizePhone', () => {
  it('accepts the ways a member might write the same number', () => {
    expect(normalizePhone('912345678')).toBe('912345678')
    expect(normalizePhone('0912345678')).toBe('912345678')
    expect(normalizePhone('+251912345678')).toBe('912345678')
    expect(normalizePhone('251912345678')).toBe('912345678')
    expect(normalizePhone('+2510912345678')).toBe('912345678')
  })

  it('ignores spaces, dashes and brackets', () => {
    expect(normalizePhone('+251 91 234 5678')).toBe('912345678')
    expect(normalizePhone('0912-345-678')).toBe('912345678')
    expect(normalizePhone('(0912) 345 678')).toBe('912345678')
  })

  it('strips nothing it should not', () => {
    expect(normalizePhone('')).toBe('')
    expect(normalizePhone('no digits here')).toBe('')
    // A leading 2 that is not a country code must survive.
    expect(normalizePhone('2912345678')).toBe('2912345678')
  })
})

describe('isPhoneValid', () => {
  it('accepts a nine-digit subscriber number in any format', () => {
    expect(isPhoneValid('912345678')).toBe(true)
    expect(isPhoneValid('0912345678')).toBe(true)
    expect(isPhoneValid('+251912345678')).toBe(true)
  })

  it('rejects anything that is not nine digits', () => {
    expect(isPhoneValid('')).toBe(false)
    expect(isPhoneValid('91234567')).toBe(false)
    expect(isPhoneValid('9123456789')).toBe(false)
    expect(isPhoneValid('not a number')).toBe(false)
  })
})

describe('phoneToAuthEmail', () => {
  it('derives one internal address per number', () => {
    expect(phoneToAuthEmail('0912345678')).toBe('912345678@users.microfinance.local')
  })

  it('maps every spelling of a number to the same account', () => {
    const forms = ['912345678', '0912345678', '+251912345678', '+251 91 234 5678']
    const addresses = new Set(forms.map(phoneToAuthEmail))
    // Sign-in and account creation must agree, or a member cannot log in.
    expect(addresses.size).toBe(1)
  })

  it('is not a routable address', () => {
    expect(phoneToAuthEmail('0912345678')).toContain('users.microfinance.local')
  })
})
