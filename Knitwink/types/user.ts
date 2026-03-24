export interface Address {
  firstName: string
  lastName: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  defaultAddress?: Address
  createdAt: string
}
