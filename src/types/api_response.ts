export interface ApiResponseInterface<D = any> {
  data?: D
  message?: string
  success?: boolean
}
