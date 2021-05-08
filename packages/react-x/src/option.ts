export type None = {
  kind: 'None'
  isNone: true
}

export type Some<T = unknown> = {
  kind: 'Some'
  isNone: false
  value: T
}

export type Option<T = unknown> = None | Some<T>

export const None: None = {
  kind: 'None',
  isNone: true,
}

export const Some = <T>(value: T): Option<T> => {
  let some: Some<T> = {
    kind: 'Some',
    value,
    isNone: false,
  }
  return some
}
