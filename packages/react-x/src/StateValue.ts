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

export const isEmptyStateValue = (arg: StateValue): arg is EmptyStateValue => {
  return arg?.kind === 'StateValue.Empty'
}

export const isDirtyStateValue = (arg: StateValue): arg is DirtyStateValue => {
  return arg?.kind === 'StateValue.Dirty'
}

export const isCleanStateValue = (arg: StateValue): arg is CleanStateValue => {
  return arg?.kind === 'StateValue.Clean'
}
