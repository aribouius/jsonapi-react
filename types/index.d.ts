declare module 'jsonapi-react' {
  interface IPlugin {
    initialize(client: ApiClient): void
  }

  type IQueryArg = string | any[] | false

  type IStringMap = { [key: string]: any }

  interface IResult {
    data?: IStringMap | IStringMap[]
    meta?: IStringMap
    links?: IStringMap
    error?: IStringMap
    errors?: IStringMap[]
    isLoading?: boolean
    isFetching?: boolean
    client: ApiClient
  }

  interface IConfig {
    url?: string
    mediaType?: string
    cacheTime?: number
    staleTime?: number
    headers?: {}
    ssrMode?: boolean
    formatError?: (error) => any
    formatErrors?: (errors) => any
    fetch?: (url: string, options: {}) => Promise<{}>
    fetchOptions?: {}
  }

  export class ApiClient {
    constructor({
      ...args
    }: {
      schema?: {}
      plugins?: IPlugin[]
    } & IConfig)

    addHeader(key: string, value: string): ApiClient

    clearCache(): void

    delete(queryArg: IQueryArg, config: IConfig): Promise<IResult>

    fetch(queryArg: IQueryArg, config: IConfig): Promise<IResult>

    isFetching(): boolean

    mutate(
      queryArg: IQueryArg,
      data: {} | [],
      config: IConfig
    ): Promise<IResult>

    removeHeader(key: string): ApiClient
  }

  export function ApiProvider({
    children,
    client,
  }: {
    children: React.ReactNode
    client: ApiClient
  }): JSX.Element

  export const ApiContext: React.Context

  export function renderWithData(
    element: JSX.Element,
    client: ApiClient,
    config?: {}
  ): [content: string, initialState: any]

  export function useClient(): ApiClient

  export function useIsFetching(): { isFetching: boolean }

  export function useMutation(
    queryArg: IQueryArg,
    config?: {
      invalidate?: string | string[]
      method?: string
      client?: ApiClient
    }
  ): [mutate: (any) => Promise<IResult>, result: IResult]

  export function useQuery(
    queryArg: IQueryArg,
    config?: {
      cacheTime?: number
      staleTime?: number
      ssr?: boolean
      client?: ApiClient
    }
  ): IResult
}
