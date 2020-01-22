import schema from './schema'
import { parseQueryArg } from '../functions'

test('it parses a string', () => {
  const result = parseQueryArg('todos', schema)

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses a string with slashes', () => {
  const result = parseQueryArg('/todos/')

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses a string with an ID', () => {
  const result = parseQueryArg('/todos/1')

  expect(result).toEqual({
    url: '/todos/1',
    id: '1',
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array', () => {
  const result = parseQueryArg(['todos'])

  expect(result).toEqual({
    url: '/todos',
    id: null,
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array with an ID', () => {
  const result = parseQueryArg(['todos', 1])

  expect(result).toEqual({
    url: '/todos/1',
    id: '1',
    params: {},
    keys: ['todos'],
  })
})

test('it parses an array with multiple segments', () => {
  const result = parseQueryArg(['users', 1, 'todos'])

  expect(result).toEqual({
    url: '/users/1/todos',
    id: null,
    params: {},
    keys: ['users', 'todos'],
  })
})

test('it parses an array with page refinements', () => {
  const result = parseQueryArg(['todos', { page: { size: 20 } }])

  expect(result).toEqual({
    url: '/todos?page[size]=20',
    id: null,
    params: { page: { size: 20 } },
    keys: ['todos'],
  })
})
