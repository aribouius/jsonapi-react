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

  return arr
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

export function normalize(result, { schema = {} } = {}) {
  if (!result) {
    return null
  }

  if (result.error) {
    if (isObject(result.error)) {
      return result
    }

    return {
      error: {
        status: String(result.status || 400),
        title: result.error,
      },
    }
  }

  if (result.errors) {
    const error = result.errors.find(error => error.status !== '422')

    if (error) {
      return { error }
    }

    return result
  }

  if (!result.data) {
    return result
  }

  let { data, included, ...rest } = result

  if (!Array.isArray(data)) {
    data = [data]
  }

  if (included) {
    data = data.concat(included)
  }

  const fields = {}
  Object.keys(schema).forEach(ref => {
    fields[ref] = schema[ref].fields
  })

  data = data.map(record => {
    const attributes = {
      id: record.id,
      ...record.attributes,
    }

    if (fields[record.type]) {
      let ref

      for (let field in fields[record.type]) {
        ref = fields[record.type][field]

        if (ref.type) {
          attributes[field] = coerceValue(attributes[field], ref.type)
        }

        if (typeof ref.resolve === 'function') {
          attributes[field] = ref.resolve(attributes[field], attributes)
        }
      }
    }

    return {
      ...record,
      attributes,
    }
  })

  data.forEach(record => {
    if (!record.relationships) {
      return
    }

    Object.keys(record.relationships).forEach(key => {
      const relation = record.relationships[key].data

      if (!relation) return

      const child = data.find(
        rec => rec.type === relation.type && rec.id === relation.id
      )

      if (child) {
        record.attributes[key] = child.attributes
      }
    })
  })

  if (Array.isArray(result.data)) {
    data = data.reduce(
      (acc, rec) =>
        result.data.find(r => r.id === rec.id)
          ? acc.concat(rec.attributes)
          : acc,
      []
    )
  } else {
    data = data.find(r => r.id === result.data.id).attributes
  }

  return { data, ...rest }
}

export function serialize(data = {}, config = {}) {
  if (!data) {
    return { data: null }
  }

  if (Array.isArray(data)) {
    return { data: data.map(record => serialize(record, config)) }
  }

  const { id, type, schema = {} } = config

  const attributes = { ...data }
  delete attributes.id

  data = { type, attributes }
  if (id) {
    data.id = id
  }

  if (schema[type]) {
    let root = schema[type]
    let rels = {}
    let ref
    let val

    for (let field in root.fields) {
      if (root.fields[field] && root.fields[field].readOnly) {
        delete attributes[field]
      }
    }

    for (let field in root.relationships) {
      if (attributes[field] !== undefined) {
        val = attributes[field]
        ref = root.relationships[field]

        delete attributes[field]

        if (Array.isArray(val)) {
          rels[field] = {
            data: val.map(obj => ({
              type: ref.type,
              id: obj.id ? String(obj.id) : null,
            })),
          }
        } else {
          rels[field] = {
            data: { type: ref.type, id: val.id ? String(val.id) : null },
          }
        }
      }
    }

    if (Object.entries(rels).length) {
      data.relationships = rels
    }
  }

  return { data }
}
