# jsonapi-react
A minimal [JSON:API](https://jsonapi.org/) client and [React](https://reactjs.org/) hooks for fetching, updating, and caching remote data.

<a href="https://bundlephobia.com/result?p=jsonapi-react@latest" target="\_parent">
  <img src="https://badgen.net/bundlephobia/minzip/jsonapi-react@latest" />
</a>
<a href="https://travis-ci.com/aribouius/jsonapi-react" target="\_parent">
  <img src="https://api.travis-ci.org/aribouius/jsonapi-react.svg?branch=master" />
</a>

## Features
- Declarative API queries and mutations
- JSON:API schema serialization + normalization
- Query caching + garbage collection
- Automatic refetching (stale-while-revalidate)
- SSR support

## Purpose
In short, to provide a similar client experience to using `React` + [GraphQL](https://graphql.org/).  

The `JSON:API` specification offers numerous benefits for writing and consuming REST API's, but at the expense of clients being required to manage complex schema serializations. There are [several projects](https://jsonapi.org/implementations/) that provide good `JSON:API` implementations,
but none offer a seamless integration with `React` without incorporating additional libraries and/or model abstractions.

Libraries like [react-query](https://github.com/tannerlinsley/react-query) and [SWR](https://github.com/zeit/swr) (both of which are fantastic, and obvious inspirations for this project) go a far way in bridging the gap when coupled with a serialization library like [json-api-normalizer](https://github.com/yury-dymov/json-api-normalizer). But both require a non-trivial amount of cache invalidation configuration, given resources can be returned from any number of endpoints.  


## Support
- React 16.8 or later
- Browsers [`> 1%, not dead`](https://browserl.ist/?q=%3E+1%25%2C+not+dead)
- Consider polyfilling:
  - [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
  - [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## Documentation
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Queries](#queries)
- [Mutations](#mutations)
- [Deleting](#deleting-resources)
- [Caching](#caching)
- [Manual Requests](#manual-requests)
- [Server-Side Rendering](#server-side-rendering)
- [API Reference](#api)
  - [useQuery](#useQuery)
  - [useMutation](#useMutation)
  - [useIsFetching](#useClient)
  - [useClient](#useClient)
  - [ApiClient](#ApiClient)
  - [ApiProvider](#ApiProvider)
  - [renderWithData](#renderWithData)
## Installation
```
npm i --save jsonapi-react
```

## Getting Started
To begin you'll need to create an [ApiClient](#ApiClient) instance and wrap your app with a provider.
```javascript
import { ApiClient, ApiProvider } from 'jsonapi-react'
import schema from './schema'

const client = new ApiClient({
  url: 'https://my-api.com',
  schema,
})

const Root = (
  <ApiProvider client={client}>
    <App />
  </ApiProvider>
)

ReactDOM.render(
  Root,
  document.getElementById('root')
)
```

### Schema Definition
In order to accurately serialize mutations and track which resource types are associated with each request, the `ApiClient` class requires a schema object that describes your API's resources and their relationships.

```javascript
new ApiClient({
  schema: {
    todos: {
      type: 'todos',
      relationships: {
        user: {
          type: 'users',
        }
      }
    },
    users: {
      type: 'users',
      relationships: {
        todos: {
          type: 'todos',
        }
      }
    }
  }
})
```

You can also describe and customize how fields get deserialized.  Field configuration is entirely _additive_, so any omitted fields are simply passed through unchanged.
```javascript
const schema = {
  todos: {
    type: 'todos',
    fields: {
      title: 'string', // shorthand
      status: {
        resolve: status => {
          return status.toUpperCase()
        },
      },
      created: {
        type: 'date', // converts value to a Date object
        readOnly: true // removes field for mutations
      }
    },
    relationships: {
      user: {
        type: 'users',
      }
    }
  },
}
```

## Queries
To make a query, call the [useQuery](#useQuery) hook with the `type` of resource you are fetching. The returned object will contain the query result, as well as information relating to the request.
```javascript
import { useQuery } from 'jsonapi-react'

function Todos() {
  const { data, meta, error, isLoading, isFetching } = useQuery('todos')

  return (
    <div>
      isLoading ? (
        <div>...loading</div>
      ) : (
        data.map(todo => (
          <div key={todo.id}>{todo.title}</div>
        ))
      )
    </div>
  )
}
```

The argument simply gets converted to an API endpoint string, so the above is equivalent to doing
```javascript
useQuery('/todos')
```

As syntactic sugar, you can also pass an array of URL segments.
```javascript
useQuery(['todos', 1])
useQuery(['todos', 1, 'comments'])
```

To apply refinements such as filtering, pagination, or included resources, pass an object of URL query parameters as the _last_ value of the array. The object gets serialized to a `JSON:API` compatible query string using [qs](https://github.com/ljharb/qs).
```javascript
useQuery(['todos', {
  filter: {
    complete: 0,
  },
  include: [
    'comments',
  ],
  page: {
    number: 1,
    size: 20,
  },  
}])
```

If a query isn't ready to be requested yet, pass a _falsey_ value to defer execution.
```javascript
const id = null
const { data: todos } = useQuery(id && ['users', id, 'todos'])
```

### Normalization
The API response data gets automatically deserialized into a nested resource structure, meaning this...
```javascript
{
  "data": {
    "id": "1",
    "type": "todos",
    "attributes": {
      "title": "Clean the kitchen!"
    },
    "relationships": {
      "user": {
        "data": {
          "type": "users",
          "id": "2"
        }
      },
    },
  },
  "included": [
    {
      "id": 2,
      "type": "users",
      "attributes": {
        "name": "Steve"
      }
    }
  ],
}
```

Gets normalized to...
```javascript
{
  id: "1",
  title: "Clean the kitchen!",
  user: {
    id: "2",
    name: "Steve"
  }
}
```

## Mutations
To run a mutation, first call the [useMutation](#useMutation) hook with a query key. The return value is a tuple that includes a `mutate` function, and an object with information related to the request. Then call the `mutate` function to execute the mutation, passing it the data to be submitted.
```javascript
import { useMutation } from 'jsonapi-react'

function AddTodo() {
  const [title, setTitle] = useState('')
  const [addTodo, { isLoading, data, error, errors }] = useMutation('todos')

  const handleSubmit = async e => {
    e.preventDefault()
    const result = await addTodo({ title })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <button type="submit">Create Todo</button>
    </form>
  )
}
```

### Serialization
The mutation function expects a [normalized](#normalization) resource object, and automatically handles serializing it. For example, this...
```javascript
{
  id: "1",
  title: "Clean the kitchen!",
  user: {
    id: "1",
    name: "Steve",
  }
}
```

Gets serialized to...
```javascript
{
  "data": {
    "id": "1",
    "type": "todos",
    "attributes": {
      "title": "Clean the kitchen!"
    },
    "relationships": {
      "user": {
        "data": {
          "type": "users",
          "id": "1"
        }
      }
    }
  }
}
```

## Deleting Resources
`jsonapi-react` doesn't currently provide a hook for deleting resources, because there's typically not much local state management associated with the action. Instead, deleting resources is supported through a [manual request](#manual-requests) on the `client` instance.


## Caching
`jsonapi-react` implements a `stale-while-revalidate` in-memory caching strategy that ensures queries are deduped across the application and only executed when needed.  Caching is disabled by default, but can be configured both globally, and/or per query instance.

### Configuration
Caching behavior is determined by two configuration values:
- `cacheTime` - The number of seconds the response should be cached from the time it is received.
- `staleTime` - The number of seconds until the response becomes stale. If a cached query that has become stale is requested, the cached response is returned, and the query is refetched in the background.  The refetched response is delivered to any active query instances, and re-cached for future requests.

To assign default caching rules for the whole application, configure the client instance.
```javascript
const client = new ApiClient({
  cacheTime: 5 * 60,
  staleTime: 60,
})
```

To override the global caching rules, pass a configuration object to `useQuery`.
```javascript
useQuery('todos', {
  cacheTime: 5 * 60,
  staleTime: 60,
})
```

### Invalidation
When performing mutations, there's a good chance one or more cached queries should get invalidated, and potentially refetched immediately.

Since the JSON:API schema allows us to determine which resources (including relationships) were updated, the following steps are automatically taken after successful mutations:

- Any cached results that contain resources with a `type` that matches either the mutated resource, or its included relationships, are invalidated and refetched for active query instances.
- If a query for the mutated resource is cached, and the query URL matches the mutation URL (i.e. the responses can be assumed analogous), the cache is updated with the mutation result and delivered to active instances.  If the URL's don't match (e.g. one used refinements), then the cache is invalidated and the query refetched for active instances.

To override which resource types get invalidated as part of a mutation, the `useMutation` hook accepts a `invalidate` option.
```JavaScript
const [mutation] = useMutation(['todos', 1], {
  invalidate: ['todos', 'comments']
})
```

## Manual Requests
Manual API requests can be performed through the client instance, which can be obtained with the [useClient](#useClient) hook

```javascript
import { useClient } from 'jsonapi-react'

function Todos() {
  const client = useClient()
}
```

The client instance is also included in the object returned from the `useQuery` and `useMutation` hooks.
```javascript
function Todos() {
  const { client } = useQuery('todos')
}

function EditTodo() {
  const [mutate, { client }] = useMutation('todos')
}
```
The client request methods have a similar signature as the hooks, and return the same response structure.

```javascript
# Queries
const { data, error } = await client.fetch(['todos', 1])

# Mutations
const { data, error, errors } = await client.mutate(['todos', 1], { title: 'New Title' })

# Deletions
const { error } = await client.delete(['todos', 1])
```

## Server-Side Rendering
Full SSR support is included out of the box, and requires a small amount of extra configuration on the server.

```javascript
import { ApiProvider, ApiClient, renderWithData } from 'jsonapi-react'

const app = new Express()

app.use(async (req, res) => {
  const client = new ApiClient({
    ssrMode: true,
    url: 'https://my-api.com',
    schema,
  })

  const Root = (
    <ApiProvider client={client}>
      <App />
    </ApiProvider>
  )

  const [content, initialState] = await renderWithData(Root, client)

  const html = <Html content={content} state={initialState} />

  res.status(200)
  res.send(`<!doctype html>\n${ReactDOM.renderToStaticMarkup(html)}`)
  res.end()
})
```

The above example assumes that the `Html` component exposes the `initialState` for client rehydration.
```html
<script>
  window.__APP_STATE__ = JSON.stringify(state)
</script>
```

On the client side you'll then need to hydrate the client instance.
```javascript
const client = new ApiClient({
  url: 'https://my-api.com',,
})

client.hydrate(
  window.__APP_STATE__
)
```

To prevent specific queries from being fetched during SSR, the `useQuery` hook accepts a `ssr` option.
```javascript
const result = useQuery('todos', { ssr: false })
```

## API

### `useQuery`
### Options
- `queryArg: String | [String, Int, Params: Object] | falsey`
  - A string, or array of strings/integers.
  - Array may contain a query parameter object as the last value.
  - If _falsey_, the query will not be executed.
- `config: Object`
  - `cacheTime: Int | null`:
    - The number of seconds to cache the query.
    - Defaults to client configuration value.
  - `staleTime: Int | null`
    - The number of seconds until the query becomes stale.
    - Defaults to client configuration value.
  - `ssr: Boolean`
    - Set to `false` to disable server-side rendering of query.
    - Defaults to context value.
  - `client: ApiClient`
    - An optional separate client instance.
    - Defaults to context provided instance.
### Result
- `data: Object | Array | undefined`
  - The normalized (deserialized) result from a successful request.
- `meta: Object | undefined`
  - A `meta` object returned from a successful request, if present.
- `links: Object | undefined`
  - A `links` object returned from a successful request, if present.
- `error: Object | undefined`
  - A request error, if thrown or returned from the server.
- `refetch: Function`
  - A function to manually refetch the query.
- `setData: Function(Object | Array)`
  - A function to manually update the local state of the `data` value.
- `client: ApiClient`
  - The client instance being used by the hook.

### `useMutation`
### Options
- `queryArg: String | [String, Int, Params: Object]`
  - A string, or array of strings/integers.
  - Array may contain a query parameter object as the last value.
- `config: Object`
  - `invalidate: String | Array`
    - One or more resource types to whose cache entries should be invalidated.
  - `method: String`
    - The request method to use.  Defaults to `POST` when creating a resource, and `PATCH` when updating.
  - `client: ApiClient`
    - An optional separate client instance.
    - Defaults to context provided instance.
### Result
- `mutate: Function(Object | Array)`
  - The mutation function you call with resource data to execute the mutation.
  - Returns a promise that resolves to the result of the mutation.
- `data: Object | Array | undefined`
  - The normalized (deserialized) result from a successful request.
- `meta: Object | undefined`
  - A `meta` object returned from a successful request, if present.
- `links: Object | undefined`
  - A `links` object returned from a successful request, if present.
- `error: Object | undefined`
  - A request error, if thrown or returned from the server.
- `errors: Array | undefined`
  - Validation errors returned from the server.
- `isLoading: Boolean`
  - Indicates whether the mutation is currently being submitted.
- `client: ApiClient`
  - The client instance being used by the hook.

### `useIsFetching`
### Result
- `isFetching: Boolean`
  - Returns `true` if any query in the application is fetching.

### `useClient`
### Result
- `client: ApiClient`
  - The client instance on the current context.

### `ApiClient`
- `url: String`
  - The full URL of the remote API.
- `mediaType: String`
  - The media type to use in request headers.
  - Defaults to `application/vnd.api+json`.
- `cacheTime: Int | Null`:
  - The number of seconds to cache the query.
  - Defaults to `0`.
- `staleTime: Int | null`
  - The number of seconds until the query becomes stale.
  - Defaults to `null`.
- `headers: Object`
  - Default headers to include on every request.
- `ssrMode: Boolean`
  - Set to `true` when running in a server environment.
  - Defaults to result of `typeof window === 'undefined'`.
- `formatError: Function(error)`
  - A function that formats a response error object.
- `formatErrors: Function(errors)`
  - A function that formats a validation error objects.
- `fetch: Function(url, options)`
  - Fetch implementation - defaults to the global `fetch`.
- `fetchOptions: Object`
  - Default options to use when calling `fetch`.
  - See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch) for available options.
### Methods
- `fetch(queryKey: String | [String, Int, Params: Object], [config]: Object)`
  - Submits a query request.
- `mutate(queryKey: String | [String, Int, Params: Object], data: Object | Array, [config]: Object)`
  - Submits a mutation request.
- `delete(queryKey: String | [String, Int, Params: Object], [config]: Object)`
  - Submits a delete request.
- `clearCache()`
  - Clears all cached requests.
- `addHeader(key: String, value: String)`
  - Adds a default header to all requests.
- `removeHeader(key: String)`
  - Removes a default header.
- `isFetching()`
  - Returns `true` if a query is being fetched by the client.
- `subscribe(callback: Function)`
  - Subscribes an event listener to client requests.
  - Returns a unsubscribe function.
- `hydrate(state: Array)`
  - Hydrates a client instance with state after SSR.

### `ApiProvider`
### Options
- `client: ApiClient`
  - The API client instance that should be used by the application.

### `renderWithData`
### Options
- `element: Object`
  - The root React element of the application.
- `client: ApiClient`
  - The client instance used during rendering.
### Result
- `content: String`
  - The rendered application string.
- `initialState: Array`
  - The extracted client state.
