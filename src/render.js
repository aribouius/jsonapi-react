import { renderToStaticMarkup } from 'react-dom/server'

export async function renderWithData(element, client, config) {
  const { render } = {
    render: renderToStaticMarkup,
    ...config,
  }

  const content = render(element)
  const promises = client.cache.map(q => q.promise).filter(Boolean)

  if (promises.length) {
    await Promise.all(promises)
    return renderWithData(element, client, config)
  }

  return [content, client.extract()]
}
