import { stringify as qs } from 'qs'

export function isString(v) {
  return typeof v === 'string'
}

export function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

export function isId(n) {
  return !!(n && String(n).match(/^[0-9]+/))
}

export function isNumber(n) {
  return !isNaN(Number(n))
}

export function isUUID(v) {
  return isString(v) && v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
}

export function toArray(val) {
  return Array.isArray(val) ? val : [val]
}

export function stringify(params, options) {
  return qs(params, {
    sort: (a, b) => a.localeCompare(b),
    arrayFormat: 'comma',
    encodeValuesOnly: true,
    ...options,
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

export function parseQueryArg(arg, options = {}) {
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
    url += '?'
    if (typeof options.stringify === 'function') {
      url += options.stringify(params, stringify)
    } else {
      url += stringify(params, options.stringify)
    }
  } else {
    params = {}
  }

  const last = keys[keys.length - 1]
  if (isId(last) || isUUID(last)) {
    id = String(keys.pop())
  }

  keys = keys.filter(k => !isId(k) && !isUUID(k))

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
      ref = ref.relationships[val]
    } else {
      ref = null
    }

    if (ref) {
      arr.push(ref.type)
      ref = schema[ref.type]
    }
  }

  return arr.length ? arr : keys.slice(0, 1)
}

export function getTypeMap(query, schema, data) {
  const rels = parseTypes(query.keys, schema)
  const type = rels.pop()

  if (query.params.include) {
    toArray(query.params.include).forEach(str => {
      const arr = str.split(',').filter(Boolean)

      arr.forEach(path => {
        const types = [type].concat(path.trim().split('.'))
        rels.push(...parseTypes(types, schema).slice(1))
      })
    })
  }

  if (data) {
    mergePayloadTypes(type, data, schema, rels)
  }

  return {
    type,
    relationships: rels.filter((r, i) => rels.indexOf(r) === i)
  }
}

export function mergePayloadTypes(type, data, schema, types = []) {
  const config = schema[type]

  if (!config || !config.relationships) {
    return
  }

  Object.keys(config.relationships).forEach(key => {
    if (data[key]) {
      const rel = config.relationships[key]
      types.push(rel.type)
      mergePayloadTypes(rel.type, data[key], schema, types)
    }
  })
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
