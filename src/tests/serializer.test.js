import schema from './schema'
import { Serializer } from '../serializer'

describe('serialize', () => {
  test('it serializes a mutation without a schema', () => {
    const serializer = new Serializer()
    const data = { id: 1, title: 'Clean the kitchen' }

    const result = serializer.serialize('todos', data)

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
    const serializer = new Serializer({ schema })
    const data = {
      id: 1,
      title: 'Clean the kitchen',
      user: {
        id: 2,
        name: 'Steve',
      },
      comments: [{ id: '1', text: 'Almost done...' }],
    }

    const result = serializer.serialize('todos', data)

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
    const serializer = new Serializer({ schema })
    const data = {
      id: 1,
      title: 'Clean the kitchen',
      status: 'done',
    }

    const result = serializer.serialize('todos', data)

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
})

describe('deserialize', () => {
  const success = {
    data: {
      id: '1',
      type: 'todos',
      attributes: {
        title: 'Clean the kitchen!',
        created: '2020-01-01T00:00:00.000Z',
      },
      relationships: {
        user: {
          data: {
            type: 'users',
            id: '2',
          },
        },
      },
    },
    included: [
      {
        id: '2',
        type: 'users',
        attributes: {
          name: 'Steve',
        },
      },
    ],
  }

  test('it normalizes a successful response', () => {
    const serializer = new Serializer()
    const result = serializer.deserialize(success)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        title: 'Clean the kitchen!',
        created: '2020-01-01T00:00:00.000Z',
        user: {
          id: '2',
          type: 'users',
          name: 'Steve',
        },
      },
    })
  })

  test('it coerces typed attributes', () => {
    const serializer = new Serializer({
      schema: {
        todos: {
          fields: {
            created: {
              type: 'date',
            },
          },
        },
      }
    })
    const result = serializer.deserialize(success)

    const isDate = result.data.created instanceof Date
    expect(isDate).toEqual(true)
  })
})
