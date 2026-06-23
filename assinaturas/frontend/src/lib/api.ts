import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Documents
export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/documents', { params }).then(r => r.data),
  create: (data: unknown) => api.post('/documents', data).then(r => r.data),
  getById: (id: string) => api.get(`/documents/${id}`).then(r => r.data),
  cancel: (id: string) => api.patch(`/documents/${id}/cancelar`).then(r => r.data),
  resend: (id: string) => api.patch(`/documents/${id}/reenviar`).then(r => r.data),
  dashboard: () => api.get('/documents/dashboard').then(r => r.data),
}

// Templates
export const templatesApi = {
  list: () => api.get('/templates').then(r => r.data),
  getById: (id: string) => api.get(`/templates/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/templates', data).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/templates/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/templates/${id}`).then(r => r.data),
}

// Clients
export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/clients/${id}`).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/clients/${id}`, data).then(r => r.data),
}

// Audit
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit', { params }).then(r => r.data),
  byDocument: (id: string) => api.get(`/audit/document/${id}`).then(r => r.data),
}

// Public (client-facing)
export const publicApi = {
  getDocument: (token: string) => axios.get(`/assinar/${token}`).then(r => r.data),
  confirmData: (token: string) => axios.post(`/assinar/${token}/confirmar-dados`).then(r => r.data),
  markViewed: (token: string) => axios.post(`/assinar/${token}/visualizou`).then(r => r.data),
  startSign: (token: string) => axios.post(`/assinar/${token}/iniciou-assinatura`).then(r => r.data),
  sign: (token: string, data: unknown) => axios.post(`/assinar/${token}/assinar`, data).then(r => r.data),
  validate: (protocolo: string) => axios.get(`/validar/${protocolo}`).then(r => r.data),
}
