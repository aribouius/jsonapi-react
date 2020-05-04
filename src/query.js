import { parseQueryArg } from './functions'

export class Query {
  constructor({ key, cache, timestamp } = {}) {
    this.key = key
    this.cache = cache
    this.timestamp = timestamp
    this.cacheTime = 0
    this.subscribers = []
    this.controller = new AbortController();
    Object.assign(this, parseQueryArg(key))
  }

  subscribe(subscriber) {
    this.subscribers.push(subscriber)

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber)
    }
  }

  dispatch(request) {
    this.subscribers.forEach(callback => {
      callback(request)
    })
  }
}
