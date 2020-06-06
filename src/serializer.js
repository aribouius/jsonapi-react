import { isObject, coerceValue } from './functions'

export class Serializer {
  constructor({ schema } = {}) {
    this.schema = schema || {}
  }

  serialize(type, attrs) {
    if (!attrs) {
      return { type, data: null }
    }

    if (Array.isArray(attrs)) {
      return { data: attrs.map(rec => this.parseResource(type, rec)) }
    }

    return {
      data: this.parseResource(type, attrs),
    }
  }

  parseResource(type, attrs = {}) {
    if (!attrs) {
      return null
    }

    attrs = { ...attrs }

    if (attrs._type) {
      type = attrs._type
      delete attrs._type
    }

    const data = { type }
    const rels = {}

    if (attrs.id) {
      data.id = String(attrs.id)
      delete attrs.id
    }

    const config = this.schema[type]
    if (!config) {
      return { ...data, attributes: attrs }
    }

    for (let field in config.relationships) {
      if (attrs[field] === undefined) {
        continue
      }

      const ref = config.relationships[field]
      const val = attrs[field]

      delete attrs[field]

      const relType = ref.type || (ref.getType ? ref.getType(attrs) : null)

      if (!relType) {
        continue
      }

      if (!ref.readOnly) {
        if (Array.isArray(val)) {
          rels[field] = {
            data: val.map(v =>
              this.parseRelationship(relType, v)
            ),
          }
        } else {
          rels[field] = {
            data: this.parseRelationship(relType, val),
          }
        }
      }
    }

    for (let field in config.fields) {
      if (config.fields[field] && config.fields[field].readOnly) {
        delete attrs[field]
      }
    }

    data.attributes = attrs

    if (Object.entries(rels).length) {
      data.relationships = rels
    }

    return data
  }

  parseRelationship(type, attrs) {
    const res = this.parseResource(type, attrs)
    return { type: res.type, id: res.id || null }
  }

  deserialize(res) {
    if (!res) {
      return null
    }

    if (res.error) {
      if (isObject(res.error)) {
        return res
      }
      return {
        error: {
          status: String(res.status || 400),
          title: res.error,
          message: res.error,
        },
      }
    }

    if (res.errors) {
      const error = res.errors.find(e => e.status !== '422')
      return error ? { error } : { errors: res.errors }
    }

    if (!res.data) {
      return res
    }

    let { data, included, ...rest } = res

    if (!Array.isArray(data)) {
      data = [data]
    }

    if (included) {
      data = data.concat(included)
    }

    const fields = {}

    Object.keys(this.schema).forEach(ref => {
      fields[ref] = this.schema[ref].fields
    })

    data = data.map(rec => {
      const attrs = {
        id: rec.id,
        ...rec.attributes,
      }

      if (fields[rec.type]) {
        let ref

        for (let field in fields[rec.type]) {
          ref = fields[rec.type][field]

          if (ref.type) {
            attrs[field] = coerceValue(attrs[field], ref.type)
          }

          if (typeof ref.resolve === 'function') {
            attrs[field] = ref.resolve(attrs[field], attrs, rec)
          }
        }
      }

      return {
        ...rec,
        attributes: attrs,
      }
    })

    data.forEach(rec => {
      if (!rec.relationships) {
        return
      }

      Object.keys(rec.relationships).forEach(key => {
        const rel = rec.relationships[key].data

        if (!rel) return

        if (Array.isArray(rel)) {
          rec.attributes[key] = rel.map(r => (
            data.find(d => d.type === r.type && d.id === r.id)
          )).filter(Boolean).map(r => r.attributes)
        } else {
          const child = data.find(r => r.type === rel.type && r.id === rel.id)
          rec.attributes[key] = child ? child.attributes : null
        }
      })
    })

    if (Array.isArray(res.data)) {
      data = data.reduce(
        (acc, rec) =>
          res.data.find(r => r.id === rec.id && r.type === rec.type)
            ? acc.concat(rec.attributes)
            : acc,
        []
      )
    } else {
      data = data.find(r => r.id === res.data.id).attributes
    }

    return { data, ...rest }
  }
}
