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
      comments: [
        { id: '1', text: 'Almost done...' }
      ],
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
            data: [
              { type: 'comments', id: '1' }
            ],
          },
        },
      },
    })
  })

  test('it serializes polymorphic resources', () => {
    const serializer = new Serializer({ schema })

    const data = {
      id: 1,
      name: 'todo.jpg',
      owner_type: 'todos',
      owner: {
        id: 1,
      }
    }

    const result = serializer.serialize('photos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'photos',
        attributes: {
          name: 'todo.jpg',
        },
        relationships: {
          owner: {
            data: {
              type: 'todos',
              id: '1',
            },
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

  test('it supports a field serializer', () => {
    const serializer = new Serializer({
      schema: {
        ...schema,
        todos: {
          ...schema.todos,
          fields: {
            ...schema.todos.fields,
            title: {
              serialize: (val, attrs) => {
                console.log('SERIALIZING', val, attrs)
                return `${val}${attrs.description}`
              }
            }
          }
        }
      }
    })

    const data = {
      id: 1,
      title: 'foo',
      description: 'bar',
    }

    const result = serializer.serialize('todos', data)

    expect(result).toEqual({
      data: {
        id: '1',
        type: 'todos',
        attributes: {
          title: 'foobar',
          description: 'bar',
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
        title: 'Clean the kitchen!',
        created: '2020-01-01T00:00:00.000Z',
        user: {
          id: '2',
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

  test('it handles polymorphic resources', () => {
    const serializer = new Serializer({ schema })

    const result = serializer.deserialize({
      data: {
        id: '1',
        type: 'photos',
        attributes: {
          name: 'photo.jpg',
        },
        relationships: {
          owner: {
            data: {
              type: 'todos',
              id: '1',
            },
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'todos',
          attributes: {
            title: 'Clean the kitchen!',
            status: 'done',
          },
        },
      ],
    })

    expect(result).toEqual({
      data: {
        id: '1',
        name: 'photo.jpg',
        url: '/photos/photo.jpg',
        owner: {
          id: '1',
          title: 'Clean the kitchen!',
          status: 'DONE',
        },
      },
    })
  })
})
