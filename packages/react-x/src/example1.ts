import { $, input, derived, derivedAsync, delay, matchAsyncState, createStore } from './core'
import { combineLatest, interval, pipe } from 'rxjs'
import { debounceTime, map, switchMap } from 'rxjs/operators'

const A1 = $.input(10)
const A2 = $.input(20)
const A3 = $.derived({
  get: (ctx) => {
    return ctx.get(A1).pipe(
      switchMap((a1) => {
        console.log(`period: ${a1 * 100}ms`)
        return interval(a1 * 100)
      }),
    )
  },
})

const B1 = $.derived({
  get: (ctx) => {
    let pair$ = combineLatest({
      a1: ctx.get(A1),
      a2: ctx.get(A2),
      a3: ctx.get(A3),
    })
    return pair$.pipe(
      map((data) => {
        return data.a1 + data.a2 + data.a3
      }),
    )
  },
})

const B2 = $.derived({
  get: (ctx) => {
    return ctx.get(B1).pipe(map((b1) => b1 * 2))
  },
})

const C1 = $.derived({
  get: (ctx) => {
    return ctx.get(B2).pipe(
      switchMap(async (b2) => {
        return `c1: ${b2.toString()}`
      }),
    )
  },
})

const store = createStore()

let c1 = store.get(C1)
let a1 = store.get(A1)
let a2 = store.get(A2)
let a3 = store.get(A3)
let b1 = store.get(B1)
let b2 = store.get(B2)

combineLatest({
  a1,
  a2,
  a3,
  b1,
  b2,
  c1,
})
  .pipe(debounceTime(0))
  .subscribe((data) => {
    console.log('data', data)
  })

store.set(A1, 20)
store.set(A1, 21)

// setTimeout(() => {
//   console.log('set A1 to 20')
//   store.set(A1, 20)
// }, 5000)

// // setTimeout(() => {
// //   store.set(A1, 12)
// // }, 4000)

// // setTimeout(() => {
// //   store.set(A2, 22)
// // }, 6000)
