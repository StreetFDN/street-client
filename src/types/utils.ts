export type Maybe<T> = T | null | undefined;

/**
 * Specialization of the Result, representing operation success with operation output data..
 */
export type Ok<TData> = {
  ok: true;
  data: TData;
};

/**
 * Specialization of the Result, representing operation failure, described by provided error.
 */
export type Nok<TError> = {
  ok: false;
  error: TError;
};

/**
 * Represent result of fallible operation. Should be used in cases where throwing exceptions is not possible,
 * like batched operations, where you need to know result of each one separately.
 */
export type Result<TData, TError> = Ok<TData> | Nok<TError>;
