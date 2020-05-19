import { Query } from './query'
import { parseSchema, getTypeMap } from './functions'
import { Serializer } from './serializer'
import * as actions from './constants'

export class ApiClient {
  constructor({ schema, plugins, ...config } = {}) {
    this.subscribers = []
    this.cache = []
    this.isMounted = false

    this.config = {
      url: null,
      mediaType: 'application/vnd.api+json',
      headers: {},
      cacheTime: 0,
      staleTime: null,
      ssrMode: typeof window === 'undefined',
      formatError: null,
      formatErrors: null,
      stringify: null,
      serialize: (type, data, schema) => {
        return new Serializer({ schema }).serialize(type, data)
      },
      normalize: (data, schema) => {
        return new Serializer({ schema }).deserialize(data)
      },
      ...config,
      fetch: config.fetch || fetch.bind(),
    }

    if (!this.config.url) {
      throw new Error('ApiClient requires a "url"')
    }

    if (schema) {
      this.schema = parseSchema(schema)
    }

    if (plugins) {
      plugins.forEach(plugin => {
        plugin.initialize(this)
      })
    }
  }

  addHeader(key, value) {
    this.config.headers[key] = value
    return this
  }

  removeHeader(key) {
    delete this.config.headers[key]
    return this
  }

  serialize(type, data) {
    return this.config.serialize(type, data, this.schema)
  }

  normalize(data, extra) {
    const result = this.config.normalize(data, this.schema)

    if (!result) {
      return null
    }

    if (result.error && this.config.formatError) {
      result.error = this.config.formatError(result.error)
    }

    if (result.errors && this.config.formatErrors) {
      result.errors = this.config.formatErrors(result.errors, extra)
    }

    return result
  }

  subscribe(subscriber) {
    this.subscribers.push(subscriber)

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber)
    }
  }

  dispatch(action) {
    this.subscribers.forEach(callback => callback(action))
  }

  isFetching() {
    return !!this.cache.find(q => q.promise)
  }

  isCached(query, cacheTime) {
    if (!query.cache) {
      return false
    }

    if (!this.isMounted) {
      return true
    }

    if (query.cache.error || query.cache.errors) {
      return false
    }

    if (cacheTime * 1000 + query.timestamp > new Date().getTime()) {
      return true
    }

    return false
  }

  createQuery(options) {
    return new Query({
      stringify: this.config.stringify,
      ...options,
    })
  }

  getQuery(query) {
    if (!(query instanceof Query)) {
      query = this.createQuery({ key: query })
    }

    if (!query.url) {
      return query
    }

    const cached = this.cache.find(q => {
      return q.url === query.url
    })

    if (cached) {
      query = cached
    } else {
      this.cache.push(query)
    }

    return query
  }

  fetch(queryArg, config = {}) {
    const {
      force = false,
      cacheTime = this.config.cacheTime,
      staleTime = this.config.staleTime,
      headers,
    } = config

    const query = this.getQuery(queryArg)

    query.cacheTime = Math.max(cacheTime, query.cacheTime)

    if (query.promise) {
      return query.promise
    }

    if (!config.force && this.isCached(query, cacheTime)) {
      if (staleTime !== null && !this.isCached(query, staleTime)) {
        this.fetch(query, { force: true })
      }

      return Promise.resolve(this.normalize(query.cache))
    }

    return query.promise = Promise.resolve().then(async () => {
      if (query.timeout) {
        clearTimeout(query.timeout)
      }

      this.dispatch({
        type: actions.REQUEST_QUERY,
        query,
      })

      query.dispatch({
        isFetching: true,
      })

      query.cache = await this.request(query.url, { headers })

      query.timestamp = new Date().getTime()
      query.promise = null

      const result = this.normalize(query.cache)

      this.dispatch({
        type: actions.RECEIVE_QUERY,
        query,
        ...result,
      })

      query.dispatch({
        isFetching: false,
        result,
      })

      if (!this.config.ssrMode && !query.subscribers.length) {
        this.scheduleGC(query)
      }

      return result
    })
  }

  async mutate(queryArg, data, config = {}) {
    const query = this.createQuery({ key: queryArg })

    const { type, relationships } = getTypeMap(query, this.schema, data)

    const { invalidate, ...options } = config

    if (!options.method) {
      options.method = query.id ? 'PATCH' : 'POST'
    }

    if (data && data !== null) {
      data = this.serialize(type, query.id ? { id: query.id, ...data } : data)
      options.body = JSON.stringify(data)
    }

    this.dispatch({
      type: actions.REQUEST_MUTATION,
      ...data,
    })

    let result = await this.request(query.url, options)
    let schema = result

    result = this.normalize(result, { payload: data })

    this.dispatch({
      type: actions.RECEIVE_MUTATION,
      ...result,
    })

    if (!schema.error && !schema.errors) {
      let invalid

      if (invalidate) {
        invalid = Array.isArray(invalidate) ? invalidate : [invalidate]
      } else if (invalidate !== false) {
        invalid = [type, ...relationships]
      }

      this.cache.forEach(q => {
        if (options.method === 'DELETE' && query.id === q.id) {
          q.cache = null
          return
        }

        if (q.id && q.url === query.url && schema.data) {
          q.cache = schema
          return q.dispatch({ result })
        }

        if (!invalid) {
          return
        }

        if (!q.type) {
          Object.assign(q, getTypeMap(q, this.schema))
        }

        const types = [q.type, ...q.relationships]

        if (types.find(t => invalid.indexOf(t) >= 0)) {
          q.cache = null

          if (q.subscribers.length) {
            this.fetch(q, { force: true })
          }
        }
      })
    }

    return result
  }

  delete(queryArg, config = {}) {
    return this.mutate(queryArg, undefined, { ...config, method: 'DELETE' })
  }

  removeQuery(query) {
    this.cache = this.cache.filter(q => q !== query)
  }

  scheduleGC(query) {
    if (query.timeout) return

    const timestamp = query.timestamp || 0
    const cacheTime = query.cacheTime || 0
    const expires = timestamp + (cacheTime * 1000)
    const timeout = Math.max(0, expires - new Date().getTime())

    if (timeout) {
      query.timeout = setTimeout(() => {
        this.removeQuery(query)
      }, timeout)
    } else {
      this.removeQuery(query)
    }
  }

  clearCache() {
    this.cache.forEach(q => {
      q.cache = null
    })
  }

  request(path, { url, ...config } = {}) {
    const uri = (url || this.config.url).replace(/\/$/, '') + path

    let headers = {
      Accept: this.config.mediaType,
      ...this.config.headers,
    }

    if (config.body) {
      headers['Content-Type'] = this.config.mediaType
    }

    if (config.headers) {
      headers = { ...headers, ...config.headers }
    }

    for (let header in headers) {
      if (headers[header] === undefined || headers[header] === null) {
        delete headers[header]
      }
    }

    return this.config
      .fetch(uri, {
        ...this.config.fetchOptions,
        ...config,
        headers: {
          ...this.config.headers,
          ...headers,
        },
      })
      .then(res => {
        return res.status === 204 ? {} : res.json()
      })
      .catch(error => {
        return {
          error: {
            status: '500',
            title: error.message,
          },
        }
      })
  }

  extract() {
    return this.cache.reduce((acc, q) => {
      if (q.cache) {
        acc.push([q.key, q.cache])
      }
      return acc
    }, [])
  }

  hydrate(queries = []) {
    const timestamp = new Date().getTime()
    queries.forEach(([key, cache]) => {
      this.cache.push(this.createQuery({ key, cache, timestamp }))
    })
  }
}
