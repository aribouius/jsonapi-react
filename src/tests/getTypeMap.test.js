import schema from './schema'
import { getTypeMap } from '../functions'

test('it parses the primary type', () => {
  const result = getTypeMap(
    {
      keys: ['todos'],
      params: {},
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: [],
  })
})

test('it parses relationships', () => {
  const result = getTypeMap(
    {
      keys: ['users', 'todos'],
      params: {},
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: ['users'],
  })
})

test('it ignores unknown segments', () => {
  const result = getTypeMap(
    {
      keys: ['users', 'todos', 'relationships'],
      params: {},
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: ['users'],
  })
})

test('it parses include string', () => {
  const result = getTypeMap(
    {
      keys: ['todos'],
      params: {
        include: 'user',
      },
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: ['users'],
  })
})

test('it parses include array', () => {
  const result = getTypeMap(
    {
      keys: ['todos'],
      params: {
        include: ['user', 'comments'],
      },
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: ['users', 'comments'],
  })
})

test('it parses include with dot notation', () => {
  const result = getTypeMap(
    {
      keys: ['todos'],
      params: {
        include: ['comments.user'],
      },
    },
    schema
  )

  expect(result).toEqual({
    type: 'todos',
    relationships: ['comments', 'users'],
  })
})
