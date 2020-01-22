import { normalize } from '../functions'

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

test('it normalizes a successful reponse', () => {
  const result = normalize(success)

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
  const result = normalize(success, {
    schema: {
      todos: {
        fields: {
          created: {
            type: 'date',
          },
        },
      },
    },
  })

  const isDate = result.data.created instanceof Date
  expect(isDate).toEqual(true)
})
