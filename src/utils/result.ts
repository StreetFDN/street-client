import { Nok, Ok } from 'types/utils';

/**
 * Helper function for wrapping successful operation output data into {@link import('../types/utils').Result}
 * @param data Successful operation output data
 */
export function ok<TData>(data: TData): Ok<TData> {
  return {
    ok: true,
    data: data,
  };
}

/**
 * Helper function for wrapping operation failure into {@link import('../types/utils').Result}
 * @param error Error encountered during operation
 */
export function nok<TError>(error: TError): Nok<TError> {
  return {
    ok: false,
    error,
  };
}
