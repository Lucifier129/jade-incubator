export type Fetch<K = unknown, V = unknown> = (key: K) => V

type Task<K = unknown, V = unknown> = (fetch: Fetch<K, V>) => V

type Tasks<K = unknown, V = unknown> = (key: K) => Task<K, V> | null

type Store<K, V> = Map<K, V>

type Build<K, V> = (tasks: Tasks<K, V>, key: K, store: Store<K, V>) => void

type Rebuilder<K, V, I> = (key: K, value: V, task: Task<K, V>, info: I) => Task<K, V>

type Scheduler<K, V, I> = (rebuilder: Rebuilder<K, V, I>) => Build<K, V>

type Chain<K> = K[]

type ExcelInfo<K> = {
  isDirty: (key: K) => boolean
  chain: Chain<K>
}

const dirtyBitRebuilder = <K, V>(key: K, value: V, task: Task<K, V>, info: ExcelInfo<K>): Task<K, V> => {
  return (fetch) => {
    if (info.isDirty(key)) {
      return task(fetch)
    }
    return value
  }
}

const restarting = <K, V>(rebuilder: Rebuilder<K, V, ExcelInfo<K>>) => (info: ExcelInfo<K>): Build<K, V> => {
  return (tasks, target, store) => {
    let go = (done: Set<K>, chain: Chain<K>): Chain<K> => {
      if (chain.length === 0) {
        return []
      }

      let [key, ...keys] = chain
      let task = tasks(key)

      if (task === null) {
        return [key, ...go(done.add(key), keys)]
      }

      let value = store.get(key)

      if (value === undefined) {
        throw new Error(`${key} is not in store`)
      }

      let newTask = rebuilder(key, value, task, info)

      let fetch = (key: K) => {
        if (done.has(key)) {
          let value = store.get(key)
          if (value === undefined) {
            throw new Error(`${key} is not in store`)
          }
          return value
        }
        throw {
          __type: 'Dep',
          key,
        }
      }

      try {
        let result = newTask(fetch)
        store.set(key, result)
        return [key, ...go(done.add(key), keys)]
      } catch (error) {
        if (error?.__type === 'Dep') {
          return go(done, [error.key, ...keys.filter((key) => key !== error.key).concat(key)])
        }
        throw error
      }
    }

    let newChain = go(new Set(), [...new Set(info.chain.concat(target))])

    info.chain = newChain
  }
}

const excel = restarting<string, number>(dirtyBitRebuilder)

const busy = <K, V>(tasks: Tasks<K, V>, key: K, store: Store<K, V>) => {
  let cache: Store<K, V> = new Map()
  let fetch: Fetch<K, V> = (key) => {
    if (cache.has(key)) {
      return cache.get(key)!
    }

    let task = tasks(key)

    if (task === null) {
      if (store.has(key)) {
        let value = store.get(key)!
        cache.set(key, value)
        return value
      }
      throw new Error(`No value in store of key: ${key}`)
    }

    let value = task(fetch)

    store.set(key, value)
    cache.set(key, value)

    return value
  }

  fetch(key)
}

const sprsh1: Tasks<string, number> = (key) => {
  if (key === 'B1') {
    return (fetch) => {
      return fetch('A1') + fetch('A2')
    }
  }

  if (key === 'B2') {
    return (fetch) => {
      return fetch('B1') * 2
    }
  }

  return null
}

const sprsh2: Tasks<string, number> = (key) => {
  if (key === 'B1') {
    return (fetch) => {
      let c1 = fetch('C1')
      if (c1 === 1) {
        return fetch('B2')
      }
      return fetch('A2')
    }
  }

  if (key === 'B2') {
    return (fetch) => {
      let c1 = fetch('C1')
      if (c1 === 1) {
        return fetch('A1')
      }
      return fetch('B1')
    }
  }

  return null
}

const sprsh3: Tasks<string, number> = (key) => {
  if (key === 'B1') {
    return (fetch) => {
      let c1 = fetch('C1')
      return fetch(`A${c1}`)
    }
  }

  return null
}

type Atom<T = unknown> = {
  type: 'Atom'
  key: string
  default: T
}

const atom = <T>(options: Omit<Atom<T>, 'type'>): Atom<T> => {
  return {
    ...options,
    type: 'Atom',
  }
}

type Selector = {
  type: 'Selector'
  key: string
  get: ({ get }: { get: Fetch<Selector | Atom, number> }) => number
}

const selector = (options: Omit<Selector, 'type'>): Selector => {
  return {
    ...options,
    type: 'Selector',
  }
}

type Rule = Atom | Selector

type Rules = Rule[]

const A1 = atom({
  key: 'A1',
  default: 10,
})

const A2 = atom({
  key: 'A2',
  default: 20,
})

const B1 = selector({
  key: 'B1',
  get: ({ get }) => {
    let a1 = get(A1)
    let a2 = get(A2)
    return a1 + a2
  },
})

const B2 = selector({
  key: 'B2',
  get: ({ get }) => {
    let b1 = get(B1)
    return b1 * 2
  },
})

const busySprsh = (rules: Rules, input: Selector | Atom, store: Store<string, number>) => {
  let tasks: Tasks<string, number> = (key) => {
    let rule = rules.find((item) => item.key === key)

    if (!rule) {
      return null
    }

    if (rule.type === 'Atom') {
      let value = rule.default as number
      return () => value
    }

    let task = rule.get

    return (fetch) => {
      return task({ get: ({ key }) => fetch(key) })
    }
  }

  return busy(tasks, input.key, store)
}

let store: Store<string, number> = new Map([
  ['A1', 10],
  ['A2', 20],
])

busy(sprsh1, 'B2', store)

console.log('B1', store.get('B1'))
console.log('B2', store.get('B2'))

store.set('A1', 20)

let excelInfo: ExcelInfo<string> = {
  isDirty: (key) => {
    return key === 'B2' || key === 'B1'
  },
  chain: [],
}

excel(excelInfo)(sprsh1, 'B2', store)

console.log('excelInfo', excelInfo)

console.log('B1', store.get('B1'))
console.log('B2', store.get('B2'))

const fibonacci: Tasks<number, number> = (n) => {
  if (n < 2) return null
  return (fetch) => {
    return fetch(n - 1) + fetch(n - 2)
  }
}

const fibonacciStore: Store<number, number> = new Map([
  [0, 0],
  [1, 1],
])

busy(fibonacci, 15, fibonacciStore)

console.log('fibonacci', JSON.stringify([...fibonacciStore.entries()]))
