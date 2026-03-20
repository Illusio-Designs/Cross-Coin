import { apiClient } from './client'

export const sendMessage = (data: {
  name: string
  email: string
  subject: string
  message: string
}) => apiClient.post<void>('/contact', data)
