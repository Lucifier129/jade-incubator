export type Fetch<K = unknown, V = unknown> = (key: K) => V

type Task<K = unknown, V = unknown> = (fetch: Fetch<K, V>) => V

type Tasks<K = unknown, V = unknown> = (key: K) => Task<K, V> | null

type Store<K, V> = Map<K, V>

const busy = <K, V>(tasks: Tasks<K, V>, key: K, store: Store<K, V>): V => {
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

  return fetch(key)
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

let store: Store<string, number> = new Map([
  ['A1', 10],
  ['A2', 20],
])

busy(sprsh1, 'B2', store)

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
