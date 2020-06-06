export default {
  users: {
    type: 'users',
    fields: {},
    relationships: {
      profile: {
        type: 'profiles',
      },
      todos: {
        type: 'todos',
      },
    },
  },
  profiles: {
    type: 'profiles',
    relationships: {
      user: {
        type: 'users',
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
      photos: {
        type: 'photos',
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
  photos: {
    type: 'photos',
    fields: {
      owner_type: {
        readOnly: true,
      },
      url: {
        resolve: (_, attrs) => `/photos/${attrs.name}`
      },
    },
    relationships: {
      owner: {
        getType: attrs => {
          return attrs.owner_type
        }
      }
    }
  }
}
