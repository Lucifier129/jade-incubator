export enum StateKind {
  AtomState = 'AtomState',
  DerivedState = 'DerivedState',
  DerivedAsyncState = 'DerivedAsyncState',
}

export type AtomState<T = unknown> = {
  kind: StateKind.AtomState
  initialState: T
}

export enum AsyncStage {
  Pending = 'AsyncPendingStage',
  Error = 'AsyncErrorStage',
  Ok = 'AsyncOkStage',
}

export type PendingState = {
  kind: AsyncStage.Pending
}

export type ErrorState = {
  kind: AsyncStage.Error
  error: Error
}

export type OkState<T = unknown> = {
  kind: AsyncStage.Ok
  value: T
}

export type AsyncState<T = unknown> = PendingState | ErrorState | OkState<T>

export type DerivedStateContext = {
  get<T>(State: AtomState<T> | DerivedState<T>): T
  get<T>(AsyncState: DerivedAsyncState<T>): AsyncState<T>
}

export type DerivedState<T = unknown> = {
  kind: StateKind.DerivedState
  get: (ctx: DerivedStateContext) => T
}

export type DerivedAsyncStateContext = {
  get<T>(State: AtomState<T> | DerivedState<T>): T
  get<T>(AsyncState: DerivedAsyncState<T>): Promise<T>
}

export type DerivedAsyncState<T = unknown> = {
  kind: StateKind.DerivedAsyncState
  get: (ctx: DerivedAsyncStateContext) => Promise<T>
}

export type StateDescription<T = unknown> = AtomState<T> | DerivedState<T> | DerivedAsyncState<T>

export type StateType<T extends StateDescription> = T extends StateDescription<infer U> ? U : never

export const atom = <T>(initialState: T): AtomState<T> => {
  return {
    kind: StateKind.AtomState,
    initialState,
  }
}

export const derived = <T>(options: Omit<DerivedState<T>, 'kind'>): DerivedState<T> => {
  return {
    ...options,
    kind: StateKind.DerivedState,
  }
}

export const derivedAsync = <T>(options: Omit<DerivedAsyncState<T>, 'kind'>): DerivedAsyncState<T> => {
  return {
    ...options,
    kind: StateKind.DerivedAsyncState,
  }
}

const A1 = atom(10)
const A2 = atom(20)

const B1 = derived({
  get: (ctx) => {
    let a1 = ctx.get(A1)
    let a2 = ctx.get(A2)
    return a1 + a2
  },
})

const B2 = derived({
  get: (ctx) => {
    let b1 = ctx.get(B1)
    return b1 * 2
  },
})

const C1 = derivedAsync({
  get: async (ctx) => {
    let b2 = ctx.get(B2)
    return b2.toString()
  },
})

const C2 = derived({
  get: (ctx) => {
    let c1 = ctx.get(C1)

    if (c1.kind === AsyncStage.Pending) {
      return 'pending...'
    }

    if (c1.kind === AsyncStage.Error) {
      return `error: ${c1.error.message}`
    }

    return `ok: ${c1.value}`
  },
})
