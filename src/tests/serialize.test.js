import schema from './schema'
import { serialize } from '../functions'

test('it serializes a mutation without a schema', () => {
  const data = { id: 1, title: 'Clean the kitchen' }

  const result = serialize(data, {
    type: 'todos',
    id: '1',
  })

  expect(result).toEqual({
    data: {
      id: '1',
      type: 'todos',
      attributes: {
        title: 'Clean the kitchen',
      },
    },
  })
})

test('it serializes a mutation with a schema', () => {
  const data = {
    id: 1,
    title: 'Clean the kitchen',
    user: {
      id: 2,
      name: 'Steve',
    },
    comments: [{ id: '1', text: 'Almost done...' }],
  }

  const result = serialize(data, {
    type: 'todos',
    id: '1',
    schema,
  })

  expect(result).toEqual({
    data: {
      id: '1',
      type: 'todos',
      attributes: {
        title: 'Clean the kitchen',
      },
      relationships: {
        user: {
          data: {
            type: 'users',
            id: '2',
          },
        },
        comments: {
          data: [{ type: 'comments', id: '1' }],
        },
      },
    },
  })
})

test('it omits read-only fields', () => {
  const data = {
    id: 1,
    title: 'Clean the kitchen',
    status: 'done',
  }

  const result = serialize(data, {
    type: 'todos',
    id: '1',
    schema,
  })

  expect(result).toEqual({
    data: {
      id: '1',
      type: 'todos',
      attributes: {
        title: 'Clean the kitchen',
      },
    },
  })
})
