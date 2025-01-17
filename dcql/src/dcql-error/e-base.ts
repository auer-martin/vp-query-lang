function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === 'object'
}

class UnknownCauseError extends Error {
  [key: string]: unknown
}

export function getCauseFromUnknown(cause: unknown): Error | undefined {
  if (cause instanceof Error) {
    return cause
  }

  const type = typeof cause
  if (type === 'undefined' || type === 'function' || cause === null) {
    return undefined
  }

  // Primitive types just get wrapped in an error
  if (type !== 'object') {
    return new Error(String(cause))
  }

  // If it's an object, we'll create a synthetic error
  if (isObject(cause)) {
    const err = new UnknownCauseError()
    for (const key in cause) {
      err[key] = cause[key]
    }
    return err
  }

  return undefined
}

export const isDcqlError = (cause: unknown): cause is DcqlError => {
  if (cause instanceof DcqlError) {
    return true
  }
  if (cause instanceof Error && cause.name === 'DcqlError') {
    // https://github.com/trpc/trpc/pull/4848
    return true
  }

  return false
}

export function getDcqlErrorFromUnknown(cause: unknown): DcqlError {
  if (isDcqlError(cause)) {
    return cause
  }

  const dcqlError = new DcqlError({
    code: 'INTERNAL_SERVER_ERROR',
    cause,
  })

  // Inherit stack from error
  if (cause instanceof Error && cause.stack) {
    dcqlError.stack = cause.stack
  }

  return dcqlError
}

type DCQL_ERROR_CODE = 'PARSE_ERROR' | 'INTERNAL_SERVER_ERROR' | 'NOT_IMPLEMENTED' | 'BAD_REQUEST'

export class DcqlError extends Error {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override doesn't work in all environments due to "This member cannot have an 'override' modifier because it is not declared in the base class 'Error'"
  public override readonly cause?: Error
  public readonly code

  constructor(opts: {
    message?: string
    code: DCQL_ERROR_CODE
    cause?: unknown
  }) {
    const cause = getCauseFromUnknown(opts.cause)
    const message = opts.message ?? cause?.message ?? opts.code

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore https://github.com/tc39/proposal-error-cause
    super(message, { cause })

    this.code = opts.code
    this.name = 'DcqlError'

    if (!this.cause) {
      // < ES2022 / < Node 16.9.0 compatability
      this.cause = cause
    }
  }
}
