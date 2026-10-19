import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiBaseUrl, requestTimeoutSignal } from './http.mjs'

test('apiBaseUrl trims and drops trailing slashes', () => {
  assert.equal(apiBaseUrl('  http://127.0.0.1:8080/  '), 'http://127.0.0.1:8080')
  assert.equal(apiBaseUrl(''), 'http://127.0.0.1:8080')
  assert.equal(apiBaseUrl(undefined), 'http://127.0.0.1:8080')
  assert.equal(apiBaseUrl('   '), 'http://127.0.0.1:8080')
})

test('requestTimeoutSignal returns AbortSignal when timeout > 0', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  process.env.AI_RADAR_TIMEOUT_MS = '50'
  try {
    const s = requestTimeoutSignal()
    assert.ok(s)
    assert.equal(typeof s.aborted, 'boolean')
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})

test('requestTimeoutSignal disabled when AI_RADAR_TIMEOUT_MS=0', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  process.env.AI_RADAR_TIMEOUT_MS = '0'
  try {
    assert.equal(requestTimeoutSignal(), undefined)
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})

test('requestTimeoutSignal disabled for negative or NaN AI_RADAR_TIMEOUT_MS', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  try {
    process.env.AI_RADAR_TIMEOUT_MS = '-1'
    assert.equal(requestTimeoutSignal(), undefined)
    process.env.AI_RADAR_TIMEOUT_MS = 'nope'
    assert.equal(requestTimeoutSignal(), undefined)
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})

test('requestTimeoutSignal empty env uses fallbackMs', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  process.env.AI_RADAR_TIMEOUT_MS = ''
  try {
    const s = requestTimeoutSignal(100)
    assert.ok(s)
    assert.equal(typeof s.aborted, 'boolean')
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})

test('requestTimeoutSignal whitespace env uses fallbackMs', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  process.env.AI_RADAR_TIMEOUT_MS = '  \t'
  try {
    const s = requestTimeoutSignal(100)
    assert.ok(s)
    assert.equal(typeof s.aborted, 'boolean')
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})

test('requestTimeoutSignal unset env uses fallbackMs', () => {
  const prev = process.env.AI_RADAR_TIMEOUT_MS
  delete process.env.AI_RADAR_TIMEOUT_MS
  try {
    const s = requestTimeoutSignal(100)
    assert.ok(s)
    assert.equal(typeof s.aborted, 'boolean')
  } finally {
    if (prev == null) delete process.env.AI_RADAR_TIMEOUT_MS
    else process.env.AI_RADAR_TIMEOUT_MS = prev
  }
})
