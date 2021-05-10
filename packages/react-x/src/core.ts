import { Reducers, CreateStoreOptions, ReducersToActions, createActions } from './store'
import { Observable, BehaviorSubject, ReplaySubject } from 'rxjs'
import { shareReplay } from 'rxjs/operators'

export type InputState<T = unknown, U = T> = {
  kind: 'State.Input'
  initialState: T | (() => T)
  set?: (ctx: SetInputStateContext, newState: U) => void
}

export type SetInputStateContext = {
  get<T>(State: InputState<T, any> | ReducerState<T, any> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): AsyncState<T>
}

export type ReducerState<S = unknown, RS extends Reducers<S> = Reducers<S>> = {
  kind: 'State.Reducer'
} & CreateStoreOptions<S, RS>

export type PendingAsyncState = {
  kind: 'AsyncState.Pending'
  isPending: true
  isError: false
  isOk: false
}

export type ErrorAsyncState = {
  kind: 'AsyncState.Error'
  error: Error
  isPending: false
  isError: true
  isOk: false
}

export type OkAsyncState<T = unknown> = {
  kind: 'AsyncState.Ok'
  state: T
  isPending: false
  isError: false
  isOk: true
}

export type AsyncState<T = unknown> = PendingAsyncState | ErrorAsyncState | OkAsyncState<T>

export type AsyncStateVisitors<T, R> = {
  Pending: () => R
  Error: (error: Error) => R
  Ok: (value: T) => R
}

export const matchAsyncState = <T, R>(asyncState: AsyncState<T>, visitors: AsyncStateVisitors<T, R>): R => {
  if (asyncState.isPending) {
    return visitors.Pending()
  }
  if (asyncState.isError) {
    return visitors.Error(asyncState.error)
  }
  if (asyncState.isOk) {
    return visitors.Ok(asyncState.state)
  }
  throw new Error(`Unexpected async state: ${asyncState}`)
}

export const PendingAsyncState = (): PendingAsyncState => {
  return {
    kind: 'AsyncState.Pending',
    isPending: true,
    isError: false,
    isOk: false,
  }
}

export const ErrorAsyncState = (error: Error): ErrorAsyncState => {
  return {
    kind: 'AsyncState.Error',
    error,
    isPending: false,
    isError: true,
    isOk: false,
  }
}

export const OkAsyncState = <T>(state: T): OkAsyncState<T> => {
  return {
    kind: 'AsyncState.Ok',
    state,
    isPending: false,
    isError: false,
    isOk: true,
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

export type DerivedStateContext = {
  get<T>(State: InputState<T, any> | ReducerState<T> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): AsyncState<T>
}

export type DerivedState<T = unknown, U = T> = {
  kind: 'State.Derived'
  get: (ctx: DerivedStateContext) => T
  set?: (ctx: DerivedStateContext, newState: U) => unknown
}

export type DerivedAsyncStateContext = {
  get<T>(State: InputState<T, any> | ReducerState<T> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): Promise<T>
}

export type DerivedAsyncState<T = unknown, U = T> = {
  kind: 'State.DerivedAsync'
  get: (ctx: DerivedAsyncStateContext) => Promise<T>
  set?: (ctx: DerivedStateContext, newState: U) => unknown
}

export type StateDescription<T = unknown, U = T> =
  | InputState<T, U>
  | ReducerState<T>
  | DerivedState<T, U>
  | DerivedAsyncState<T, U>

export type StateType<T> = T extends StateDescription<infer U> ? U : never

export const isInputState = <T = unknown>(arg: StateDescription<T>): arg is InputState<T> => {
  return arg.kind === 'State.Input'
}

export const isReducerState = <T = unknown>(arg: StateDescription<T>): arg is ReducerState<T> => {
  return arg.kind === 'State.Reducer'
}

export const isDerivedState = <T = unknown>(arg: StateDescription<T>): arg is DerivedState<T> => {
  return arg.kind === 'State.Derived'
}

export const isDerivedAsyncState = <T = unknown>(arg: StateDescription<T>): arg is DerivedAsyncState<T> => {
  return arg.kind === 'State.DerivedAsync'
}

type ReducerStateOptions = {
  name?: string
  devtools?: boolean
  logger?: boolean
}

export function input<T, U = T>(initialState: T | (() => T)): InputState<T, U>

export function input<S, RS extends Reducers<S>>(
  initialState: S,
  reducers: RS,
  options?: ReducerStateOptions,
): ReducerState<S, RS>

export function input(initialState: unknown, reducers?: Reducers, options?: ReducerStateOptions) {
  if (typeof reducers === 'undefined') {
    return {
      kind: 'State.Input',
      initialState,
    }
  }

  return {
    ...options,
    kind: 'State.Reducer',
    initialState,
    reducers,
  }
}

export const derived = <T, U = T>(options: Omit<DerivedState<T, U>, 'kind'>): DerivedState<T, U> => {
  return {
    ...options,
    kind: 'State.Derived',
  }
}

export const derivedAsync = <T, U = T>(options: Omit<DerivedAsyncState<T, U>, 'kind'>): DerivedAsyncState<T, U> => {
  return {
    ...options,
    kind: 'State.DerivedAsync',
  }
}

export type EmptyStateValue = {
  kind: 'StateValue.Empty'
}

export type DirtyStateValue<T = unknown> = {
  kind: 'StateValue.Dirty'
  dirtyValue: T
}

export type CleanStateValue<T = unknown> = {
  kind: 'StateValue.Clean'
  cleanValue: T
}

export type StateValue<T = unknown> = EmptyStateValue | DirtyStateValue<T> | CleanStateValue<T>

export const isEmptyStateValue = (arg: StateValue): arg is EmptyStateValue => {
  return arg?.kind === 'StateValue.Empty'
}

export const isDirtyStateValue = (arg: StateValue): arg is DirtyStateValue => {
  return arg?.kind === 'StateValue.Dirty'
}

export const isCleanStateValue = (arg: StateValue): arg is CleanStateValue => {
  return arg?.kind === 'StateValue.Clean'
}

export type InputBuildNode = {
  kind: 'BuildNode.Input'
  buildInfo: BuildInfo
  State: InputState
  value: unknown
  consumers: DerivableBuildNodeSet
  isWip: boolean
}

export type ReducerBuildNode = {
  kind: 'BuildNode.Reducer'
  buildInfo: BuildInfo
  State: ReducerState
  value: unknown
  consumers: DerivableBuildNodeSet
  isWip: boolean
}

export type DerivedBuildNode = {
  kind: 'BuildNode.Derived'
  buildInfo: BuildInfo
  State: DerivedState
  state: StateValue<unknown>
  providers: BuildNodeSet
  consumers: DerivableBuildNodeSet
  isWip: boolean
}

export type DerivedAsyncBuildNode = {
  kind: 'BuildNode.DerivedAsync'
  buildInfo: BuildInfo
  State: DerivedAsyncState
  state: StateValue<AsyncState>
  providers: BuildNodeSet
  consumers: DerivableBuildNodeSet
  isWip: boolean
}

export type AtomBuildNode = InputBuildNode | ReducerBuildNode

export type DerivableBuildNode = DerivedBuildNode | DerivedAsyncBuildNode

export type BuildNode = AtomBuildNode | DerivableBuildNode

export const isInputBuildNode = (arg: BuildNode): arg is InputBuildNode => {
  return arg.kind === 'BuildNode.Input'
}

export const isReducerBuildNode = (arg: BuildNode): arg is ReducerBuildNode => {
  return arg.kind === 'BuildNode.Reducer'
}

export const isDerivedBuildNode = (arg: BuildNode): arg is DerivedBuildNode => {
  return arg.kind === 'BuildNode.Derived'
}

export const isDerivedAsyncBuildNode = (arg: BuildNode): arg is DerivedAsyncBuildNode => {
  return arg.kind === 'BuildNode.DerivedAsync'
}

export type AtomBuildNodeSet = Set<AtomBuildNode>

export type DerivableBuildNodeSet = Set<DerivableBuildNode>

export type BuildNodeSet = Set<BuildNode>

export type BuildNodeStorage = {
  input: Map<InputState, InputBuildNode>
  reducer: Map<ReducerState, ReducerBuildNode>
  derived: Map<DerivedState, DerivedBuildNode>
  derivedAsync: Map<DerivedAsyncState, DerivedAsyncBuildNode>
  promise: Map<DerivedAsyncState, Promise<unknown>>
}

export type BuildInfo = Store & {
  storage: BuildNodeStorage
  dirtyBuildNodeSet: BuildNodeSet
}

export type StoreSubscriber<T = unknown> = (state: T) => unknown

export type StoreUnsubscribe = () => void

export type Store = {
  get: DerivedStateContext['get']
  set<T, U = T>(State: StateDescription<T, U>, state: U): void
  getActions<S, RS extends Reducers<S>>(ReducerState: ReducerState<S, RS>): ReducersToActions<RS>
  subscribe<T>(State: StateDescription<T>, subscriber: StoreSubscriber<T>): StoreUnsubscribe
  publish(State: StateDescription): void
}

export const syncStateStore = <K, V>(target: Map<K, V>, source: Map<K, V>) => {
  for (let [key, value] of source) {
    target.set(key, value)
  }
}

type Deferred<T = unknown> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

const createDeferred = <T = unknown>(): Deferred<T> => {
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

const getInputBuildNode = (buildInfo: BuildInfo, State: InputState): InputBuildNode => {
  if (buildInfo.storage.input.has(State)) {
    return buildInfo.storage.input.get(State)!
  }
  let inputBuildNode: InputBuildNode = {
    kind: 'BuildNode.Input',
    buildInfo,
    State,
    value: typeof State.initialState === 'function' ? State.initialState() : State.initialState,
    consumers: new Set(),
    isWip: false,
  }
  buildInfo.storage.input.set(State, inputBuildNode)
  return inputBuildNode
}

const getReducerBuildNode = (buildInfo: BuildInfo, State: ReducerState): ReducerBuildNode => {
  if (buildInfo.storage.reducer.has(State)) {
    return buildInfo.storage.reducer.get(State)!
  }
  let reducerBuildNode: ReducerBuildNode = {
    kind: 'BuildNode.Reducer',
    buildInfo,
    State,
    value: State.initialState,
    consumers: new Set(),
    isWip: false,
  }
  buildInfo.storage.reducer.set(State, reducerBuildNode)
  return reducerBuildNode
}

const getDerivedBuildNode = (buildInfo: BuildInfo, State: DerivedState): DerivedBuildNode => {
  if (buildInfo.storage.derived.has(State)) {
    return buildInfo.storage.derived.get(State)!
  }
  let derivedBuildNode: DerivedBuildNode = {
    kind: 'BuildNode.Derived',
    buildInfo,
    State,
    state: {
      kind: 'StateValue.Empty',
    },
    providers: new Set(),
    consumers: new Set(),
    isWip: false,
  }
  buildInfo.storage.derived.set(State, derivedBuildNode)
  return derivedBuildNode
}

const getDerivedAsyncBuildNode = (buildInfo: BuildInfo, State: DerivedAsyncState): DerivedAsyncBuildNode => {
  if (buildInfo.storage.derivedAsync.has(State)) {
    return buildInfo.storage.derivedAsync.get(State)!
  }
  let derivedAsyncBuildNode: DerivedAsyncBuildNode = {
    kind: 'BuildNode.DerivedAsync',
    buildInfo,
    State,
    state: {
      kind: 'StateValue.Empty',
    },
    providers: new Set(),
    consumers: new Set(),
    isWip: false,
  }
  buildInfo.storage.derivedAsync.set(State, derivedAsyncBuildNode)
  return derivedAsyncBuildNode
}

const markDirty = (buildNode: BuildNode, dirtyBuildNodeSet: BuildNodeSet = new Set()): BuildNodeSet => {
  buildNode.isWip = true

  dirtyBuildNodeSet.add(buildNode)

  if (isDerivedBuildNode(buildNode) || isDerivedAsyncBuildNode(buildNode)) {
    if (isCleanStateValue(buildNode.state)) {
      buildNode.state = {
        kind: 'StateValue.Dirty',
        dirtyValue: buildNode.state.cleanValue,
      }
    }
  }

  for (let consumer of buildNode.consumers) {
    markDirty(consumer)
  }

  buildNode.isWip = false

  return dirtyBuildNodeSet
}

const getBuildNode = (buildInfo: BuildInfo, State: StateDescription): BuildNode => {
  if (isInputState(State)) {
    return getInputBuildNode(buildInfo, State)
  }

  if (isReducerState(State)) {
    return getReducerBuildNode(buildInfo, State)
  }

  if (isDerivedState(State)) {
    return getDerivedBuildNode(buildInfo, State)
  }

  if (isDerivedAsyncState(State)) {
    return getDerivedAsyncBuildNode(buildInfo, State)
  }

  throw new Error(`Unexpected State in getBuildNode(...): ${State}`)
}

const publishBuildNodeSet = (buildInfo: BuildInfo) => {
  let dirtyBuildNodeSet = buildInfo.dirtyBuildNodeSet

  buildInfo.dirtyBuildNodeSet = new Set()

  for (let buildNode of dirtyBuildNodeSet) {
    buildInfo.publish(buildNode.State)
  }
}

const compute = (buildNode: DerivableBuildNode) => {
  buildNode.isWip = true

  for (let provider of buildNode.providers) {
    provider.consumers.delete(buildNode)
  }

  if (isDerivedBuildNode(buildNode)) {
    let derivedStateContext: DerivedStateContext = {
      get: (State: StateDescription): any => {
        let provider = getBuildNode(buildNode.buildInfo, State)
        buildNode.providers.add(provider)
        provider.consumers.add(buildNode)
        return buildNode.buildInfo.get(State as any)
      },
    }

    let state = buildNode.State.get(derivedStateContext)

    buildNode.state = {
      kind: 'StateValue.Clean',
      cleanValue: state,
    }
  } else if (isDerivedAsyncBuildNode(buildNode)) {
    let derivedAsyncStateContext: DerivedAsyncStateContext = {
      get: (State: StateDescription): any => {
        let provider = getBuildNode(buildNode.buildInfo, State)

        buildNode.providers.add(provider)
        provider.consumers.add(buildNode)

        if (!isDerivedAsyncState(State)) {
          return buildNode.buildInfo.get(State)
        }

        let asyncState = buildNode.buildInfo.get(State)

        if (isPendingStage(asyncState)) {
          let deferred = createDeferred()
          let promise = buildNode.buildInfo.storage.promise.get(State)!
          let isOutdated = () => {
            return buildNode.buildInfo.storage.promise.get(buildNode.State) !== promise
          }

          promise
            .then((state) => {
              if (isOutdated()) return
              deferred.resolve(state)
            })
            .catch((error) => {
              if (isOutdated()) return
              deferred.reject(error)
            })

          return deferred.promise
        } else if (isErrorStage(asyncState)) {
          return Promise.reject(asyncState.error)
        }
        return Promise.resolve(asyncState.state)
      },
    }

    let promise = Promise.resolve(buildNode.State.get(derivedAsyncStateContext))

    let isOutdated = () => {
      return buildNode.buildInfo.storage.promise.get(buildNode.State) !== promise
    }

    buildNode.state = {
      kind: 'StateValue.Clean',
      cleanValue: PendingAsyncState(),
    }

    buildNode.buildInfo.storage.promise.set(buildNode.State, promise)

    promise
      .then((state) => {
        if (isOutdated()) return
        markDirty(buildNode, buildNode.buildInfo.dirtyBuildNodeSet)
        buildNode.state = {
          kind: 'StateValue.Clean',
          cleanValue: OkAsyncState(state),
        }
        publishBuildNodeSet(buildNode.buildInfo)
      })
      .catch((error) => {
        if (isOutdated()) return
        markDirty(buildNode, buildNode.buildInfo.dirtyBuildNodeSet)
        buildNode.state = {
          kind: 'StateValue.Clean',
          cleanValue: ErrorAsyncState(error),
        }
        publishBuildNodeSet(buildNode.buildInfo)
      })
  }

  buildNode.isWip = false
}

export const createStore = (): Store => {
  let subscriberStorage = new Map<StateDescription, Set<StoreSubscriber>>()

  let buildInfo: BuildInfo = {
    get: (State: StateDescription): any => {
      let buildNode = getBuildNode(buildInfo, State)

      if (isInputBuildNode(buildNode) || isReducerBuildNode(buildNode)) {
        return buildNode.value
      }

      if (isCleanStateValue(buildNode.state)) {
        return buildNode.state.cleanValue
      }

      compute(buildNode)

      if (isDerivedBuildNode(buildNode)) {
        return buildInfo.get(buildNode.State)
      }

      if (isDerivedAsyncBuildNode(buildNode)) {
        return buildInfo.get(buildNode.State)
      }

      throw new Error(`Unexpected State in get(...): ${State}`)
    },
    set: (State, state) => {
      let buildNode = getBuildNode(buildInfo, State as StateDescription)

      markDirty(buildNode, buildInfo.dirtyBuildNodeSet)

      if (isInputBuildNode(buildNode)) {
        if (buildNode.State.set) {
          buildNode.State.set(
            {
              get: buildInfo.get,
            },
            state,
          )
        } else {
          buildNode.value = state
        }
      } else if (isReducerBuildNode(buildNode)) {
        buildNode.value = state
      } else if (isDerivedBuildNode(buildNode)) {
        buildNode.State.set?.(
          {
            get: buildInfo.get,
          },
          state,
        )
      } else if (isDerivedAsyncBuildNode(buildNode)) {
        buildNode.State.set?.(
          {
            get: buildInfo.get,
          },
          state,
        )
      }

      publishBuildNodeSet(buildInfo)
    },
    subscribe: (State, subscriber) => {
      let subscribers = subscriberStorage.get(State as StateDescription) ?? new Set()
      subscriberStorage.set(State as StateDescription, subscribers)

      subscribers.add(subscriber as StoreSubscriber)
      return () => {
        subscribers.delete(subscriber as StoreSubscriber)
      }
    },
    publish: (State) => {
      let state = store.get(State as any)
      let subscribers = subscriberStorage.get(State as StateDescription) ?? new Set()
      subscriberStorage.set(State as StateDescription, subscribers)

      for (let subscriber of subscribers) {
        subscriber(state)
      }
    },
    storage: {
      input: new Map(),
      reducer: new Map(),
      derived: new Map(),
      derivedAsync: new Map(),
      promise: new Map(),
    },
    dirtyBuildNodeSet: new Set(),

    getActions: (State) => {
      let actions = createActions(State.reducers, (action) => {
        let reducer = State.reducers[action.type]
        let state = buildInfo.get(State)
        let newState = reducer(state, action.payload)
        buildInfo.set(State, newState)
        return action
      })

      return actions
    },
  }

  let store: Store = {
    get: buildInfo.get,
    set: buildInfo.set,
    subscribe: buildInfo.subscribe,
    publish: buildInfo.publish,
    getActions: buildInfo.getActions,
  }

  return store
}

export const observable = <T>(initialState: T) => {
  let Inner = input(() => {
    let subject = new ReplaySubject<T>(1)
    subject.next(initialState)
    return subject
  })

  return derived<Observable<T>, T>({
    get: (ctx) => {
      return ctx.get(Inner).asObservable()
    },
    set: (ctx, state) => {
      ctx.get(Inner).next(state)
    },
  })
}

export const derivedObservable = <T, U = T>(
  options: Omit<DerivedState<Observable<T>, U>, 'kind'>,
): DerivedState<Observable<T>, U> => {
  return {
    ...options,
    get: (ctx) => {
      return options.get(ctx).pipe(shareReplay(1))
    },
    kind: 'State.Derived',
  }
}

export const $ = {
  input: observable,
  derived: derivedObservable,
}

export const delay = (time: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time)
  })
}
