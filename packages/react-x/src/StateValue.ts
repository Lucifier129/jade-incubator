export type StateValue<T = unknown> = EmptyStateValue | DirtyStateValue<T> | CleanStateValue<T>

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

export const EmptyStateValue = (): EmptyStateValue => {
  return {
    kind: 'StateValue.Empty',
  }
}

export const DirtyStateValue = <T>(dirtyValue: T): DirtyStateValue<T> => {
  return {
    kind: 'StateValue.Dirty',
    dirtyValue,
  }
}

export const CleanStateValue = <T>(cleanValue: T): CleanStateValue<T> => {
  return {
    kind: 'StateValue.Clean',
    cleanValue,
  }
}

export const isEmptyStateValue = (arg: StateValue): arg is EmptyStateValue => {
  return arg.kind === 'StateValue.Empty'
}

export const isDirtyStateValue = (arg: StateValue): arg is DirtyStateValue => {
  return arg.kind === 'StateValue.Dirty'
}

export const isCleanStateValue = (arg: StateValue): arg is CleanStateValue => {
  return arg.kind === 'StateValue.Clean'
}

export type StateValueVisitors<T, R> = {
  Empty: () => R
  Dirty: (value: T) => R
  Clean: (value: T) => R
}

export const matchStateValue = <T, R>(stateValue: StateValue<T>, visitors: StateValueVisitors<T, R>): R => {
  if (isEmptyStateValue(stateValue)) {
    return visitors.Empty()
  }

  if (isDirtyStateValue(stateValue)) {
    return visitors.Dirty(stateValue.dirtyValue)
  }

  if (isCleanStateValue(stateValue)) {
    return visitors.Clean(stateValue.cleanValue)
  }

  throw new Error(`Unexpected state value: ${stateValue}`)
}
