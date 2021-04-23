import { ListType, ObjectType, StructType } from 'farrow-schema'

export type Node = {
  type: string
  props: {} | null
  children: ChildrenNode
}

export type Renderable = {
  render(): ChildNode | ChildrenNode
}

export type ChildNode = Node | Renderable | string | number | boolean | null | undefined

export type ChildrenNode = ChildNode[]

const make = <T extends Node['type'], P extends Node['props'], C extends Node['children']>(
  type: T,
  props: P,
  ...children: C
) => {
  return {
    type,
    props,
    children,
  }
}

const makeFactory = <T extends Node['type']>(tagName: T) => <P extends Node['props'], C extends Node['children']>(
  props: P,
  ...children: C
) => {
  return make(tagName, props, ...children)
}

const Tag = {
  div: makeFactory('div'),
  span: makeFactory('span'),
  h1: makeFactory('h1'),
  h2: makeFactory('h2'),
  h3: makeFactory('h3'),
  h4: makeFactory('h4'),
  header: makeFactory('header'),
  footer: makeFactory('footer'),
  section: makeFactory('section'),
}

// prettier-ignore
const Header = () => {
  return Tag.header(
    { class: 'header' }, 
    Tag.div(
      null, 
      Tag.span(
        null, 
        'title'
      ))
  )
}

export type ConsumerStart<T> = {
  type: 'ConsumerStart'
  start: () => ConsumerNext<T>
  error: () => ConsumerError<T>
}

export type ConsumerNext<T> = {
  type: 'ConsumerNext'
  next: (value: T) => ConsumerNext<T>
  error: () => ConsumerError<T>
  finish: () => ConsumerFinish<T>
}

export type ConsumerError<T> = {
  type: 'ConsumerError'
  finish: () => ConsumerFinish<T>
}

export type ConsumerFinish<T> = {
  type: 'ConsumerFinish'
  start: () => ConsumerNext<T>
}

export type Consumer<T> = ConsumerStart<T> | ConsumerNext<T> | ConsumerError<T> | ConsumerFinish<T>
