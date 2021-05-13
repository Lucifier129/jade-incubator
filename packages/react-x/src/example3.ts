import { input, derived, derivedAsync, factory, createStore } from './core'

type TodoType = {
  todoId: number
  content: string
  completed: boolean
}

const Todo = factory((todoId: number, options?: Partial<TodoType>) => {
  let initTodo: TodoType = {
    todoId,
    content: '',
    completed: false,
    ...options,
  }
  return input(initTodo, {
    update: (todo: TodoType, content: string): TodoType => {
      return {
        ...todo,
        content,
      }
    },
    toggle: (todo: TodoType): TodoType => {
      return {
        ...todo,
        completed: !todo.completed,
      }
    },
  })
})

const TodoIdList = input([] as number[], {
  add: (list: number[], todoId: number): number[] => {
    return list.concat(todoId)
  },
  remove: (list: number[], todoId: number): number[] => {
    return list.filter((item) => item !== todoId)
  },
  clear: (): number[] => {
    return []
  },
})

const TodoList = derived({
  get: (ctx) => {
    let todos = ctx.get(TodoIdList).map((todoId) => ctx.get(Todo(todoId)))
    return todos
  },
})

const store = createStore()

store.subscribeForAll(() => {
  let todoIdList = store.get(TodoIdList)
  let todos = store.get(TodoList)
  console.log('todoIdList', todoIdList)
  console.log('todos', todos)
})

store.batch(() => {
  store.getActions(TodoIdList).add(0)
  store.getActions(TodoIdList).add(1)
  store.getActions(TodoIdList).add(2)
  store.getActions(TodoIdList).add(3)
  store.getActions(TodoIdList).add(4)

  store.getActions(Todo(0)).toggle()
  store.getActions(Todo(0)).update('todo0')
})
