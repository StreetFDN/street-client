import { Nok, Ok } from 'types/utils';

export function ok<TData>(data: TData): Ok<TData> {
  return {
    ok: true,
    data: data,
  };
}

export function nok<TError>(error: TError): Nok<TError> {
  return {
    ok: false,
    error,
  };
}
