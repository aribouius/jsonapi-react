declare module 'jsonapi-react' {
  interface IPlugin {
    initialize(client: ApiClient): void
  }

  type Falsey = false | undefined | null

  type QueryArg<TQueryParams = any> = Falsey | string | [
    type: string,
    queryParams?: TQueryParams,
    ...queryKeys: any[],
  ]

  type StringMap = { [key: string]: any }

  interface IResult<TData = StringMap | StringMap[]> {
    data?: TData
    meta?: StringMap
    links?: StringMap
    error?: StringMap
    errors?: StringMap[]
    refetch?: () => void
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
    stringify?: <TQueryParams = any>(q: TQueryParams) => string
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

    delete(queryArg: QueryArg, config?: IConfig): Promise<IResult>

    fetch(queryArg: QueryArg, config?: IConfig): Promise<IResult>

    isFetching(): boolean

    mutate(
      queryArg: QueryArg,
      data: {} | [],
      config?: IConfig
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

  export function useMutation<TData = StringMap | StringMap[]>(
    queryArg: QueryArg,
    config?: {
      invalidate?: string | string[]
      method?: string
      client?: ApiClient
    }
  ): [mutate: (any) => Promise<IResult<TData>>, result: IResult<TData>]

  export function useQuery<TData = StringMap | StringMap[]>(
    queryArg: QueryArg,
    config?: {
      cacheTime?: number
      staleTime?: number
      ssr?: boolean
      client?: ApiClient
    }
  ): IResult<TData>
}
