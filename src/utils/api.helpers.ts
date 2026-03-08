import { ApiResponseInterface } from '@/types/api_response'

export const apiResponse = <D = any>(
  success: boolean,
  message: string,
  data?: D,
): ApiResponseInterface<D> => {
  return {
    success,
    message,
    data,
  }
}
