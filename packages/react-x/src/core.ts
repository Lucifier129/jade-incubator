import LRUCache from 'lru-cache'

import {
  AsyncState,
  isPendingStage,
  isErrorStage,
  PendingAsyncState,
  OkAsyncState,
  ErrorAsyncState,
} from './AsyncState'
import { StateValue, isCleanStateValue, CleanStateValue, EmptyStateValue, DirtyStateValue } from './StateValue'
import { createDeferred } from './Deferred'
import { Reducers, ReducersToActions, createActions } from './reducer'

export type InputState<S = unknown, RS extends Reducers<S> = Reducers<S>> = {
  kind: 'State.Input'
  initialState: S | (() => S)
  reducers: RS
}

export type StateGetterContext = {
  get<T>(State: InputState<T> | InputState<T> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): AsyncState<T>
  asyncGet<T>(AsyncState: DerivedAsyncState<T, any>): Promise<T>
}

export type StateSetterContext = {
  get: StateGetterContext['get']
  set<T, U = T>(State: InputState<T> | WriteableDerivedState<T, U> | WriteableDerivedAsyncState<T, U>, state: U): void
}

export type ReadOnlyDerivedState<T = unknown> = {
  kind: 'State.Derived'
  get: (ctx: StateGetterContext) => T
}

export type WriteableDerivedState<T = unknown, U = T> = {
  kind: 'State.Derived'
  get: (ctx: StateGetterContext) => T
  set: (ctx: StateSetterContext, newState: U) => unknown
}

export type DerivedState<T = unknown, U = T> = ReadOnlyDerivedState<T> | WriteableDerivedState<T, U>

export type ReadOnlyDerivedAsyncState<T = unknown> = {
  kind: 'State.DerivedAsync'
  get: (ctx: StateGetterContext) => Promise<T>
}

export type WriteableDerivedAsyncState<T = unknown, U = T> = {
  kind: 'State.DerivedAsync'
  get: (ctx: StateGetterContext) => Promise<T>
  set: (ctx: StateSetterContext, newState: U) => unknown
}

export type DerivedAsyncState<T = unknown, U = T> = ReadOnlyDerivedAsyncState<T> | WriteableDerivedAsyncState<T, U>

export type StateDescription<T = unknown, U = T> = InputState<T> | DerivedState<T, U> | DerivedAsyncState<T, U>

export type StateType<T> = T extends StateDescription<infer U> ? U : never

export const isInputState = <T, U = T>(arg: StateDescription<T, U>): arg is InputState<T> => {
  return arg.kind === 'State.Input'
}

export const isDerivedState = <T, U = T>(arg: StateDescription<T, U>): arg is DerivedState<T, U> => {
  return arg.kind === 'State.Derived'
}

export const isDerivedAsyncState = <T, U = T>(arg: StateDescription<T, U>): arg is DerivedAsyncState<T, U> => {
  return arg.kind === 'State.DerivedAsync'
}

export const isReadOnlyDerivedState = <T, U = T>(arg: StateDescription<T, U>): arg is ReadOnlyDerivedState<T> => {
  return isDerivedState(arg) && !('set' in arg)
}

export const isReadOnlyDerivedAsyncState = <T, U = T>(
  arg: StateDescription<T, U>,
): arg is ReadOnlyDerivedAsyncState<T> => {
  return isDerivedAsyncState(arg) && !('set' in arg)
}

export const isWriteableDerivedState = <T, U = T>(arg: StateDescription<T, U>): arg is WriteableDerivedState<T, U> => {
  return isDerivedState(arg) && 'set' in arg
}

export const isWriteableDerivedAsyncState = <T, U = T>(
  arg: StateDescription<T, U>,
): arg is WriteableDerivedAsyncState<T, U> => {
  return isDerivedAsyncState(arg) && 'set' in arg
}

export function input<S, RS extends Reducers<S>>(initialState: S | (() => S), reducers?: RS): InputState<S, RS> {
  return {
    kind: 'State.Input',
    initialState,
    reducers: reducers || ({} as RS),
  }
}

export function derived<T, U = T>(options: Omit<WriteableDerivedState<T, U>, 'kind'>): WriteableDerivedState<T, U>
export function derived<T>(options: Omit<ReadOnlyDerivedState<T>, 'kind'>): ReadOnlyDerivedState<T>
export function derived<T, U = T>(options: Omit<DerivedState<T, U>, 'kind'>): DerivedState<T, U> {
  return {
    ...options,
    kind: 'State.Derived',
  }
}

export function derivedAsync<T, U = T>(
  options: Omit<WriteableDerivedAsyncState<T, U>, 'kind'>,
): WriteableDerivedAsyncState<T, U>
export function derivedAsync<T>(options: Omit<ReadOnlyDerivedAsyncState<T>, 'kind'>): ReadOnlyDerivedAsyncState<T>
export function derivedAsync<T, U = T>(options: Omit<DerivedAsyncState<T, U>, 'kind'>): DerivedAsyncState<T, U> {
  return {
    ...options,
    kind: 'State.DerivedAsync',
  }
}

export type InputBuildNode = {
  kind: 'BuildNode.Input'
  buildInfo: BuildInfo
  State: InputState
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

export type DerivableBuildNode = DerivedBuildNode | DerivedAsyncBuildNode

export type BuildNode = InputBuildNode | DerivableBuildNode

export const isInputBuildNode = (arg: BuildNode): arg is InputBuildNode => {
  return arg.kind === 'BuildNode.Input'
}

export const isDerivedBuildNode = (arg: BuildNode): arg is DerivedBuildNode => {
  return arg.kind === 'BuildNode.Derived'
}

export const isDerivedAsyncBuildNode = (arg: BuildNode): arg is DerivedAsyncBuildNode => {
  return arg.kind === 'BuildNode.DerivedAsync'
}

export type DerivableBuildNodeSet = Set<DerivableBuildNode>

export type BuildNodeSet = Set<BuildNode>

export type BuildStorage = {
  input: Map<InputState, InputBuildNode>
  derived: Map<DerivedState, DerivedBuildNode>
  derivedAsync: Map<DerivedAsyncState, DerivedAsyncBuildNode>
  promise: Map<DerivedAsyncState, Promise<unknown>>
}

export type BuildInfo = Store & {
  storage: BuildStorage
  dirtyBuildNodeSet: BuildNodeSet
  status: 'lock' | 'unlock'
}

export type StoreSubscriber<T = unknown> = (state: T) => unknown

export type StoreUnsubscribe = () => void

export type Store = {
  get: StateGetterContext['get']
  set: StateSetterContext['set']
  getActions<S, RS extends Reducers<S>>(ReducerState: InputState<S, RS>): ReducersToActions<RS>
  subscribe<T>(State: StateDescription<T, any>, subscriber: StoreSubscriber<T>): StoreUnsubscribe
  subscribeForAll(subscriber: () => unknown): StoreUnsubscribe
  publish(State: StateDescription<any>): void
  publishForAll(): void
  lock: () => void
  unlock: () => void
  batch: (f: () => unknown) => void
  commit: () => void
}

export const syncStateStore = <K, V>(target: Map<K, V>, source: Map<K, V>) => {
  for (let [key, value] of source) {
    target.set(key, value)
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

const getDerivedBuildNode = (buildInfo: BuildInfo, State: DerivedState): DerivedBuildNode => {
  if (buildInfo.storage.derived.has(State)) {
    return buildInfo.storage.derived.get(State)!
  }
  let derivedBuildNode: DerivedBuildNode = {
    kind: 'BuildNode.Derived',
    buildInfo,
    State,
    state: EmptyStateValue(),
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
    state: EmptyStateValue(),
    providers: new Set(),
    consumers: new Set(),
    isWip: false,
  }
  buildInfo.storage.derivedAsync.set(State, derivedAsyncBuildNode)
  return derivedAsyncBuildNode
}

const markDirty = (buildNode: BuildNode) => {
  if (buildNode.buildInfo.dirtyBuildNodeSet.has(buildNode)) {
    return
  }

  buildNode.isWip = true

  buildNode.buildInfo.dirtyBuildNodeSet.add(buildNode)

  if (isDerivedBuildNode(buildNode) || isDerivedAsyncBuildNode(buildNode)) {
    if (isCleanStateValue(buildNode.state)) {
      buildNode.state = DirtyStateValue(buildNode.state.cleanValue)
    }
  }

  for (let consumer of buildNode.consumers) {
    markDirty(consumer)
  }

  buildNode.isWip = false
}

const getBuildNode = (buildInfo: BuildInfo, State: StateDescription): BuildNode => {
  if (isInputState(State)) {
    return getInputBuildNode(buildInfo, State)
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

  if (dirtyBuildNodeSet.size > 0) {
    buildInfo.publishForAll()
  }
}

const compute = (buildNode: DerivableBuildNode) => {
  buildNode.isWip = true

  for (let provider of buildNode.providers) {
    provider.consumers.delete(buildNode)
  }

  let stateGetterContext: StateGetterContext = {
    get: (State: StateDescription): any => {
      let provider = getBuildNode(buildNode.buildInfo, State)
      buildNode.providers.add(provider)
      provider.consumers.add(buildNode)
      return buildNode.buildInfo.get(State as any)
    },
    asyncGet: (State) => {
      let provider = getBuildNode(buildNode.buildInfo, State)

      buildNode.providers.add(provider)
      provider.consumers.add(buildNode)

      let asyncState = buildNode.buildInfo.get(State)

      if (isPendingStage(asyncState)) {
        type T = StateType<typeof State>
        let deferred = createDeferred<T>()
        let promise = buildNode.buildInfo.storage.promise.get(State)

        if (!promise) {
          throw new Error(`Unexpected asyncGet(...), no promise found`)
        }

        let isOutdated = () => {
          return buildNode.buildInfo.storage.promise.get(State) !== promise
        }

        promise
          .then((state) => {
            if (isOutdated()) return
            deferred.resolve(state as T)
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

  if (isDerivedBuildNode(buildNode)) {
    let state = buildNode.State.get(stateGetterContext)
    buildNode.state = CleanStateValue(state)
  } else if (isDerivedAsyncBuildNode(buildNode)) {
    let promise = Promise.resolve(buildNode.State.get(stateGetterContext))

    let isOutdated = () => {
      return buildNode.buildInfo.storage.promise.get(buildNode.State) !== promise
    }

    buildNode.state = CleanStateValue(PendingAsyncState())

    buildNode.buildInfo.storage.promise.set(buildNode.State, promise)

    promise
      .then((state) => {
        if (isOutdated()) return
        markDirty(buildNode)

        buildNode.state = CleanStateValue(OkAsyncState(state))

        publishBuildNodeSet(buildNode.buildInfo)
      })
      .catch((error) => {
        if (isOutdated()) return
        markDirty(buildNode)

        buildNode.state = CleanStateValue(ErrorAsyncState(error))

        publishBuildNodeSet(buildNode.buildInfo)
      })
  }

  buildNode.isWip = false
}

export const createStore = (): Store => {
  let subscriberStorage = new Map<StateDescription, Set<StoreSubscriber>>()
  let subscribeAllStorage = new Set<() => unknown>()

  let store: Store = {
    get: (State: StateDescription): any => {
      let buildNode = getBuildNode(buildInfo, State)

      if (isInputBuildNode(buildNode)) {
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

      markDirty(buildNode)

      let prevStatus = buildInfo.status

      buildInfo.status = 'lock'

      if (isInputBuildNode(buildNode)) {
        buildNode.value = state
      } else if (isWriteableDerivedState(State)) {
        State.set(
          {
            get: buildInfo.get,
            set: buildInfo.set,
          },
          state,
        )
      } else if (isWriteableDerivedAsyncState(State)) {
        State.set(
          {
            get: buildInfo.get,
            set: buildInfo.set,
          },
          state,
        )
      }

      buildInfo.status = prevStatus

      if (prevStatus === 'unlock') {
        publishBuildNodeSet(buildInfo)
      }
    },
    subscribe: (State, subscriber) => {
      let subscribers = subscriberStorage.get(State as StateDescription) ?? new Set()
      subscriberStorage.set(State as StateDescription, subscribers)

      subscribers.add(subscriber as StoreSubscriber)

      subscriber(store.get(State as any))

      return () => {
        subscribers.delete(subscriber as StoreSubscriber)
      }
    },
    subscribeForAll: (subscriber) => {
      subscribeAllStorage.add(subscriber)
      subscriber()
      return () => {
        subscribeAllStorage.delete(subscriber)
      }
    },
    publishForAll: () => {
      for (let subscriber of subscribeAllStorage) {
        subscriber()
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
    lock: () => {
      buildInfo.status = 'lock'
    },
    unlock: () => {
      buildInfo.status = 'unlock'
    },
    commit: () => {
      publishBuildNodeSet(buildInfo)
    },
    batch: (f) => {
      buildInfo.lock()
      try {
        f()
      } finally {
        buildInfo.unlock()
        buildInfo.commit()
      }
    },
  }

  let buildInfo: BuildInfo = {
    ...store,
    status: 'unlock',
    storage: {
      input: new Map(),
      reducer: new Map(),
      derived: new Map(),
      derivedAsync: new Map(),
      promise: new Map(),
    },
    dirtyBuildNodeSet: new Set(),
  }

  return store
}

export const delay = (time: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time)
  })
}

export type JsonType =
  | number
  | string
  | boolean
  | null
  | undefined
  | JsonType[]
  | {
      toJSON(): string
    }
  | {
      [key: string]: JsonType
    }

export type StateProducer<T extends StateDescription = StateDescription, U extends JsonType = JsonType, O = void> = (
  arg: U,
  options?: O,
) => T

export type StateFactory<T extends StateDescription, U extends JsonType, O = void> = StateProducer<T, U, O> & {
  clear: () => void
  delete: (arg: U) => boolean
}

export type StateFactoryOptions<U extends JsonType> = {
  max?: number
  key?: (arg: U) => string
}

export const factory = <T extends StateDescription<any, any>, U extends JsonType, O = void>(
  producer: StateProducer<T, U, O>,
  options?: StateFactoryOptions<U>,
): StateFactory<T, U, O> => {
  let config: Required<StateFactoryOptions<U>> = {
    max: Infinity,
    key: (arg) => JSON.stringify(arg),
    ...options,
  }
  let cache = new LRUCache<string, T>({
    max: config.max,
  })

  let fn: StateFactory<T, U, O> = ((arg) => {
    let key = config.key(arg)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    let value = producer(arg)
    cache.set(key, value)

    return value
  }) as StateFactory<T, U, O>

  fn.clear = () => {
    cache.reset()
  }

  fn.delete = (arg) => {
    let key = config.key(arg)
    let hasValue = cache.has(key)
    cache.del(key)
    return hasValue
  }

  return fn
}
