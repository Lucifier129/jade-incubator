export type Deferred<T = unknown> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export const createDeferred = <T = unknown>(): Deferred<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void
  let promise = new Promise<T>((a, b) => {
    resolve = a
    reject = b
  })
  return {
    promise,
    resolve,
    reject,
  }
}
