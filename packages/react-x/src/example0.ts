import { input, derived, derivedAsync, delay, createStore } from './core'
import { matchAsyncState } from './AsyncState'

const A1 = input(10)
const A2 = input(20)

const A4 = derived({
  get: (ctx) => {
    return ctx.get(A1) + 1
  },
  set: (ctx, value: number) => {
    ctx.set(A1, value - 1)
    ctx.set(A1, value - 1)
    ctx.set(A1, value - 1)
    ctx.set(A1, value - 1)
    ctx.set(A1, value - 1)
  },
})

const A3 = input(0, {
  incre: (state: number, step = 1) => {
    return state + step
  },
  decre: (state: number, step = 1) => {
    return state - step
  },
})

const B1 = derived({
  get: (ctx) => {
    let a1 = ctx.get(A1)
    let a2 = ctx.get(A2)
    let a3 = ctx.get(A3)
    return a1 + a2 + a3
  },
})

const B2 = derived({
  get: (ctx) => {
    let b1 = ctx.get(B1)
    return b1 * 2
  },
})

const C1 = derivedAsync({
  get: async (ctx) => {
    let b2 = ctx.get(B2)
    await delay(1000)
    return `c1: ${b2.toString()}`
  },
})

const C2 = derived({
  get: (ctx) => {
    let c1 = ctx.get(C1)
    return matchAsyncState(c1, {
      Pending: () => 'pending...',
      Error: (error) => `error: ${error.message}`,
      Ok: (state) => `c2: ${state}`,
    })
  },
})

const C3 = derivedAsync({
  get: async (ctx) => {
    let c1 = await ctx.asyncGet(C1)
    return `c3: ${c1}`
  },
})

const store = createStore()

store.subscribeForAll(() => {
  let c1 = store.get(C1)
  let c2 = store.get(C2)
  let c3 = store.get(C3)
  let a1 = store.get(A1)
  let a2 = store.get(A2)
  let a3 = store.get(A3)
  let b1 = store.get(B1)
  let b2 = store.get(B2)

  console.log(
    JSON.stringify({
      a1,
      a2,
      a3,
      b1,
      b2,
      c1,
      c2,
      c3,
    }),
  )
})

store.set(A1, 11)
store.set(A2, 21)

store.set(A4, 13)

setTimeout(() => {
  console.log('setTimeout')
  store.getActions(A3).incre(10)
}, 2000)
