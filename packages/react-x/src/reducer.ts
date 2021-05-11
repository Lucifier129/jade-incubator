export type ReducerWithoutPayload<S = any> = (state: S) => S
export type ReducerWithPayload<S = any, P = any> = (state: S, payload: P) => S
export type ReducerWithOptionalPayload<S = any, P = any> = (state: S, payload?: P) => S

export type Reducer<S = any> = ReducerWithPayload<S> | ReducerWithoutPayload<S> | ReducerWithOptionalPayload<S>

export type Reducers<S = any> = {
  [key: string]: Reducer<S>
}

type AnyFn = (...args: any) => any

export type Actions = {
  [key: string]: AnyFn | Actions
}

export type Tail<T extends any[]> = ((...t: T) => any) extends (_: any, ...tail: infer TT) => any ? TT : []

export type ReducerToAction<R extends Reducer> = R extends (...args: infer Args) => any
  ? (...args: Tail<Args>) => void
  : never

export type ReducersToActions<RS extends Reducers> = {
  [key in keyof RS]: ReducerToAction<RS[key]>
}

export type ActionObject = {
  type: string
  payload?: unknown
}

type Dispatch = (action: ActionObject) => void

export const createActions = <RS extends Reducers>(reducers: RS, dispatch: Dispatch): ReducersToActions<RS> => {
  let actions = {} as ReducersToActions<RS>

  for (let actionType in reducers) {
    let reducer = reducers[actionType]
    let action = ((payload: any) => {
      dispatch({
        type: actionType,
        payload,
      })
    }) as ReducerToAction<typeof reducer>

    actions[actionType] = action
  }

  return actions
}
