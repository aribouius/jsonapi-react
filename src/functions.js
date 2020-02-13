import { stringify as qs } from 'qs'

export function isString(v) {
  return typeof v === 'string'
}

export function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

export function isNumber(n) {
  return !isNaN(Number(n))
}

export function toArray(val) {
  return Array.isArray(val) ? val : [val]
}

export function stringify(params) {
  return qs(params, {
    sort: (a, b) => a.localeCompare(b),
    arrayFormat: 'comma',
    encodeValuesOnly: true,
  })
}

export function parseSchema(schema = {}) {
  if (!isObject(schema)) {
    return {}
  }

  return Object.keys(schema).reduce((result, type) => {
    const obj = schema[type]

    if (!isObject(obj)) {
      return result
    }

    result[type] = {
      type: obj.type || type,
      fields: {},
      relationships: {},
    }

    for (let key of ['fields', 'relationships']) {
      const map = obj[key]

      if (isObject(map)) {
        let item

        for (let name in map) {
          item = map[name]

          if (isObject(item)) {
            result[type][key][name] = { ...item }
          } else {
            result[type][key][name] = { type: item }
          }
        }
      }
    }

    return result
  }, {})
}

export function parseQueryArg(arg) {
  if (!arg) {
    return {}
  }

  let keys = toArray(arg).reduce((acc, val) => {
    return acc.concat(isString(val) ? val.split('/').filter(Boolean) : val)
  }, [])

  let id = null
  let params

  if (isObject(keys[keys.length - 1])) {
    params = keys.pop()
  }

  let url = `/${keys.join('/')}`

  if (params) {
    url += `?${stringify(params)}`
  } else {
    params = {}
  }

  if (isNumber(keys[keys.length - 1])) {
    id = String(keys.pop())
  }

  keys = keys.filter(k => !isNumber(k))

  return {
    url,
    id,
    params,
    keys,
  }
}

export function parseTypes(keys, schema = {}) {
  let arr = []
  let ref

  for (let val of keys) {
    if (!ref) {
      ref = schema[val]
    } else if (ref.relationships[val]) {
      ref = schema[ref.relationships[val].type]
    } else {
      ref = null
    }

    if (ref) {
      arr.push(ref.type)
    }
  }

  return arr.length ? arr : keys.slice(0, 1)
}

export function getTypeMap(query, schema) {
  const relationships = parseTypes(query.keys, schema)
  const type = relationships.pop()

  if (query.params.include) {
    toArray(query.params.include).forEach(str => {
      const arr = str.split(',').filter(Boolean)

      arr.forEach(path => {
        relationships.push(
          ...parseTypes([type].concat(path.trim().split('.')), schema).slice(1)
        )
      })
    })
  }

  return { type, relationships }
}

export function coerceValue(val, type) {
  switch (type) {
    case 'string':
      return String(val || (val === 0 ? 0 : ''))
    case 'number':
      return val ? parseInt(val, 10) : val
    case 'float':
      return val ? parseFloat(val, 10) : val
    case 'date':
      return val ? new Date(val) : val
    case 'boolean':
      return !!val
    default:
      return val
  }
}
