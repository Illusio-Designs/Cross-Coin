import { apiClient } from '@/lib/api/client'

export async function getPolicyByName(name) {
  return apiClient.get(`/api/policies/name/${name}`, { suppressErrorToast: true })
}
