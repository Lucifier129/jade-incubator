import {
  AsyncState,
  isPendingStage,
  isErrorStage,
  PendingAsyncState,
  OkAsyncState,
  ErrorAsyncState,
} from './AsyncState'
import { createDeferred } from './Deferred'
import { Reducers, ReducersToActions, createActions } from './reducer'
import { StateValue, isCleanStateValue } from './StateValue'

export type InputState<S = unknown, RS extends Reducers<S> = Reducers<S>> = {
  kind: 'State.Input'
  initialState: S | (() => S)
  reducers: RS
}

export type SyncStateContext = {
  get<T>(State: InputState<T> | InputState<T> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): AsyncState<T>
  set<T, U = T>(State: StateDescription<T, U>, state: U): void
}

export type AsyncStateContext = {
  get<T>(State: InputState<T> | InputState<T> | DerivedState<T, any>): T
  get<T>(AsyncState: DerivedAsyncState<T, any>): Promise<T>
  set: SyncStateContext['set']
}

export type DerivedState<T = unknown, U = T> = {
  kind: 'State.Derived'
  get: (ctx: SyncStateContext) => T
  set?: (ctx: SyncStateContext, newState: U) => unknown
}

export type DerivedAsyncState<T = unknown, U = T> = {
  kind: 'State.DerivedAsync'
  get: (ctx: AsyncStateContext) => Promise<T>
  set?: (ctx: SyncStateContext, newState: U) => unknown
}

export type StateDescription<T = unknown, U = T> = InputState<T> | DerivedState<T, U> | DerivedAsyncState<T, U>

export type StateType<T> = T extends StateDescription<infer U> ? U : never

export const isInputState = <T = unknown>(arg: StateDescription<T>): arg is InputState<T> => {
  return arg.kind === 'State.Input'
}

export const isDerivedState = <T = unknown>(arg: StateDescription<T>): arg is DerivedState<T> => {
  return arg.kind === 'State.Derived'
}

export const isDerivedAsyncState = <T = unknown>(arg: StateDescription<T>): arg is DerivedAsyncState<T> => {
  return arg.kind === 'State.DerivedAsync'
}

export function input<S, RS extends Reducers<S>>(initialState: S | (() => S), reducers?: RS): InputState<S, RS> {
  return {
    kind: 'State.Input',
    initialState,
    reducers: reducers || ({} as RS),
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
}

export type StoreSubscriber<T = unknown> = (state: T) => unknown

export type StoreUnsubscribe = () => void

export type Store = {
  get: SyncStateContext['get']
  set<T, U = T>(State: StateDescription<T, U>, state: U): void
  getActions<S, RS extends Reducers<S>>(ReducerState: InputState<S, RS>): ReducersToActions<RS>
  subscribe<T>(State: StateDescription<T, any>, subscriber: StoreSubscriber<T>): StoreUnsubscribe
  subscribeForAll(subscriber: () => unknown): StoreUnsubscribe
  publish(State: StateDescription<any>): void
  publishForAll(): void
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

const markDirty = (buildNode: BuildNode) => {
  if (buildNode.buildInfo.dirtyBuildNodeSet.has(buildNode)) {
    return
  }

  buildNode.isWip = true

  buildNode.buildInfo.dirtyBuildNodeSet.add(buildNode)

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

  if (isDerivedBuildNode(buildNode)) {
    let derivedStateContext: SyncStateContext = {
      get: (State: StateDescription): any => {
        let provider = getBuildNode(buildNode.buildInfo, State)
        buildNode.providers.add(provider)
        provider.consumers.add(buildNode)
        return buildNode.buildInfo.get(State as any)
      },
      set: buildNode.buildInfo.set,
    }

    let state = buildNode.State.get(derivedStateContext)

    buildNode.state = {
      kind: 'StateValue.Clean',
      cleanValue: state,
    }
  } else if (isDerivedAsyncBuildNode(buildNode)) {
    let derivedAsyncStateContext: AsyncStateContext = {
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
      set: buildNode.buildInfo.set,
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
        markDirty(buildNode)
        buildNode.state = {
          kind: 'StateValue.Clean',
          cleanValue: OkAsyncState(state),
        }
        publishBuildNodeSet(buildNode.buildInfo)
      })
      .catch((error) => {
        if (isOutdated()) return
        markDirty(buildNode)
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
  let subscribeAllStorage = new Set<() => unknown>()

  let isWip = false

  let buildInfo: BuildInfo = {
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

      let prevIsWip = isWip

      isWip = true

      if (isInputBuildNode(buildNode)) {
        buildNode.value = state
      } else if (isDerivedBuildNode(buildNode)) {
        buildNode.State.set?.(
          {
            get: buildInfo.get,
            set: buildInfo.set,
          },
          state,
        )
      } else if (isDerivedAsyncBuildNode(buildNode)) {
        buildNode.State.set?.(
          {
            get: buildInfo.get,
            set: buildInfo.set,
          },
          state,
        )
      }

      isWip = prevIsWip

      if (!prevIsWip) {
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
    subscribeForAll: buildInfo.subscribeForAll,
    publish: buildInfo.publish,
    publishForAll: buildInfo.publishForAll,
    getActions: buildInfo.getActions,
  }

  return store
}

export const delay = (time: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time)
  })
}
