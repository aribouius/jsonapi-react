export default {
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
      status: {
        readOnly: true,
        resolve: status => (status ? status.toUpperCase() : status),
      },
      created: {
        type: 'date',
      },
    },
    relationships: {
      user: {
        type: 'users',
      },
      comments: {
        type: 'comments',
      },
    },
  },
  comments: {
    type: 'comments',
    relationships: {
      todo: {
        type: 'todos',
      },
      user: {
        type: 'users',
      },
    },
  },
}
