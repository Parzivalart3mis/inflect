export class FetchError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function parse(res: Response) {
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const code = data?.error?.code ?? 'error'
    const message = data?.error?.message ?? res.statusText ?? 'Request failed'
    throw new FetchError(code, message, res.status)
  }
  return data
}

/** SWR fetcher. */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  return parse(res)
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/** JSON mutation helper. Throws FetchError carrying the API error code. */
export async function mutateJson<T = unknown>(
  url: string,
  method: Method,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return parse(res)
}
