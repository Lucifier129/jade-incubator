export type AsyncState<T = unknown> = PendingAsyncState | ErrorAsyncState | OkAsyncState<T>

export type PendingAsyncState = {
  kind: 'AsyncState.Pending'
}

export type ErrorAsyncState = {
  kind: 'AsyncState.Error'
  error: Error
}

export type OkAsyncState<T = unknown> = {
  kind: 'AsyncState.Ok'
  state: T
}

export type AsyncStateVisitors<T, R> = {
  Pending: () => R
  Error: (error: Error) => R
  Ok: (value: T) => R
}

export const matchAsyncState = <T, R>(asyncState: AsyncState<T>, visitors: AsyncStateVisitors<T, R>): R => {
  if (asyncState.kind === 'AsyncState.Pending') {
    return visitors.Pending()
  }
  if (asyncState.kind === 'AsyncState.Error') {
    return visitors.Error(asyncState.error)
  }
  if (asyncState.kind === 'AsyncState.Ok') {
    return visitors.Ok(asyncState.state)
  }
  throw new Error(`Unexpected async state: ${asyncState}`)
}

export const PendingAsyncState = (): PendingAsyncState => {
  return {
    kind: 'AsyncState.Pending',
  }
}

export const ErrorAsyncState = (error: Error): ErrorAsyncState => {
  return {
    kind: 'AsyncState.Error',
    error,
  }
}

export const OkAsyncState = <T>(state: T): OkAsyncState<T> => {
  return {
    kind: 'AsyncState.Ok',
    state,
  }
}

export const isPendingStage = <T>(input: AsyncState<T>): input is PendingAsyncState => {
  return input.kind === 'AsyncState.Pending'
}

export const isErrorStage = <T>(input: AsyncState<T>): input is ErrorAsyncState => {
  return input.kind === 'AsyncState.Error'
}

export const isOkStage = <T>(input: AsyncState<T>): input is OkAsyncState<T> => {
  return input.kind === 'AsyncState.Ok'
}
