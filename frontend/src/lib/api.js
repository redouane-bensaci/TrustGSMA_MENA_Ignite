const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const TOKEN_KEY = 'trust_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request(path, { method = 'GET', body, auth = false, query } = {}) {
  const url = new URL(BASE_URL + path)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message = data?.detail || res.statusText || 'Request failed'
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status, data?.detail)
  }
  return data
}

export const api = {
  // auth
  signup: (payload) => request('/v1/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/v1/auth/login', { method: 'POST', body: payload }),
  me: () => request('/v1/auth/me', { auth: true }),
  getKeys: () => request('/v1/auth/keys', { auth: true }),
  rotateKey: (keyType) => request('/v1/auth/keys/rotate', { method: 'POST', auth: true, body: { key_type: keyType } }),

  // webhooks
  listWebhooks: () => request('/v1/webhooks', { auth: true }),
  registerWebhook: (url, events) => request('/v1/webhooks', { method: 'POST', auth: true, body: { url, events } }),
  listDeliveries: (webhookId) => request(`/v1/webhooks/${webhookId}/deliveries`, { auth: true }),

  // business bindings
  listBindings: () => request('/v1/business-bindings'),
  getBinding: (id) => request(`/v1/business-bindings/${id}`),
  createBinding: (payload) => request('/v1/business-bindings', { method: 'POST', body: payload }),
  updateBinding: (id, updates) => request(`/v1/business-bindings/${id}`, { method: 'PATCH', body: updates }),

  // verify / transactions
  verify: (payload) => request('/v1/verify', { method: 'POST', body: payload }),
  getCounterpartyHistory: (msisdn) => request(`/v1/counterparty-history/${encodeURIComponent(msisdn)}`),
  listTransactions: (query) => request('/v1/transactions', { query }),
  getTransaction: (id) => request(`/v1/transactions/${id}`),

  // tools
  listTools: () => request('/v1/tools'),
}

export { ApiError, BASE_URL }
