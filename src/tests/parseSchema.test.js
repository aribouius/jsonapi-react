import { parseSchema } from '../functions'

test('it normalizes a schema', () => {
  expect(
    parseSchema({
      users: {
        type: 'users',
        relationships: {
          todos: 'todos',
        },
      },
      todos: {
        fields: {
          title: 'string',
          created: {
            type: 'date',
          },
        },
        relationships: {
          user: {
            type: 'users',
          },
        },
      },
    })
  ).toEqual({
    users: {
      type: 'users',
      fields: {},
      relationships: {
        todos: {
          type: 'todos',
        },
      },
    },
    todos: {
      type: 'todos',
      fields: {
        title: {
          type: 'string',
        },
        created: {
          type: 'date',
        },
      },
      relationships: {
        user: {
          type: 'users',
        },
      },
    },
  })
})
