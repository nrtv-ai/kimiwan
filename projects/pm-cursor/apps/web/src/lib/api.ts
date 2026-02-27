import axios from 'axios'

const TOKENS_KEY = 'pm_cursor_tokens'

function getAccessToken(): string | null {
  try {
    const rawTokens = localStorage.getItem(TOKENS_KEY)
    if (!rawTokens) return localStorage.getItem('token')
    const parsed = JSON.parse(rawTokens)
    return parsed?.accessToken || null
  } catch {
    return localStorage.getItem('token')
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for auth tokens
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Keep response interceptor minimal; auth refresh logic lives in useAuth.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)
