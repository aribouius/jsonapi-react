import React from 'react'
import { ApiClient } from './client'

export const ApiContext = React.createContext()

export function ApiProvider({ children, ...config }) {
  const context = React.useContext(ApiContext)

  config = React.useMemo(() => {
    const result = {
      ...context,
      ...config,
    }

    if (!result.client) {
      throw new Error('ApiProvider requires a "client" prop')
    }

    if (!result.client instanceof ApiClient) {
      throw new Error('"client" prop must be an ApiClient instance')
    }

    if (context) {
      result.client.isMounted = context.client.isMounted
    }

    return result
  }, [context, config.client])

  React.useEffect(() => {
    config.client.isMounted = true
  }, [])

  return <ApiContext.Provider value={config} children={children} />
}
