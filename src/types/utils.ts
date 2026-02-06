export type Maybe<T> = T | null | undefined;

export type Ok<TData> = {
  ok: true;
  data: TData;
};

export type Nok<TError> = {
  ok: false;
  error: TError;
};

export type Result<TData, TError> = Ok<TData> | Nok<TError>;
