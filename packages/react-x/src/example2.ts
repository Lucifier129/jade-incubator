import { createStore, input as coreInput } from './core'
import { input, derived, toObserver } from './observable'
import { interval } from 'rxjs'
import { map } from 'rxjs/operators'

const A1 = coreInput(1000)

const B1 = derived({
  get: (ctx) => {
    return interval(ctx.get(A1)).pipe(
      map((value) => {
        return value
      }),
    )
  },
})

const store = createStore()

store.subscribe(
  B1,
  toObserver((b1) => {
    console.log('b1', b1)
    if (b1 === 10) {
      store.set(A1, 100)
    }
    if (b1 === 1000) {
      store.set(A1, 1000)
    }
  }),
)
