import { Observable, ReplaySubject, Subscription } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import * as core from './core'
import { DerivedState, StoreSubscriber } from './core'

export const input = <T>(initialState: T) => {
  let Inner = core.input(() => {
    let subject = new ReplaySubject<T>(1)
    subject.next(initialState)
    return subject
  })

  return core.derived<Observable<T>, T>({
    get: (ctx) => {
      return ctx.get(Inner).asObservable()
    },
    set: (ctx, state) => {
      ctx.get(Inner).next(state)
    },
  })
}

export const derived = <T, U = T>(
  options: Omit<DerivedState<Observable<T>, U>, 'kind'>,
): DerivedState<Observable<T>, U> => {
  return {
    ...options,
    get: (ctx) => {
      return options.get(ctx).pipe(shareReplay({ bufferSize: 1, refCount: true }))
    },
    kind: 'State.Derived',
  }
}

export const toObserver = <T>(subscriber: StoreSubscriber<T>) => {
  let subscription: Subscription | null = null
  return (observable: Observable<T>) => {
    subscription?.unsubscribe()
    subscription = observable.subscribe(subscriber)
  }
}
