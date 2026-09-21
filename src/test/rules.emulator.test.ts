import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

import rules from '../../firestore.rules?raw'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'microfinance-test',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8181,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe('firestore rules', () => {
  it('allows any signed-in user to read', async () => {
    const db = testEnv.authenticatedContext('user-1', { role: 'user' }).firestore()
    await assertSucceeds(getDoc(doc(db, 'users', 'someone')))
  })

  it('denies unauthenticated reads', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users', 'someone')))
  })

  it('allows admin writes', async () => {
    const db = testEnv.authenticatedContext('admin-1', { role: 'admin' }).firestore()
    await assertSucceeds(setDoc(doc(db, 'users', 'user-2'), { name: 'A', role: 'user' }))
  })

  it('denies non-admin writes', async () => {
    const db = testEnv.authenticatedContext('user-1', { role: 'user' }).firestore()
    await assertFails(setDoc(doc(db, 'users', 'user-2'), { name: 'A', role: 'user' }))
  })

  const adminOnlyCollections = ['targets', 'contributions', 'loans', 'repayments'] as const

  for (const collectionName of adminOnlyCollections) {
    it(`allows signed-in users to read ${collectionName}`, async () => {
      const db = testEnv.authenticatedContext('user-1', { role: 'user' }).firestore()
      await assertSucceeds(getDoc(doc(db, collectionName, 'doc-1')))
    })

    it(`allows admin writes to ${collectionName}`, async () => {
      const db = testEnv.authenticatedContext('admin-1', { role: 'admin' }).firestore()
      await assertSucceeds(setDoc(doc(db, collectionName, 'doc-1'), { amount: 1 }))
    })

    it(`denies non-admin writes to ${collectionName}`, async () => {
      const db = testEnv.authenticatedContext('user-1', { role: 'user' }).firestore()
      await assertFails(setDoc(doc(db, collectionName, 'doc-1'), { amount: 1 }))
    })
  }
})
