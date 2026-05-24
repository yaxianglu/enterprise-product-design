import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:8010'

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url = `${AGENT_URL}/api/v1/${path}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      duplex: 'half',
    } as RequestInit)

    const responseHeaders = new Headers(res.headers)
    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Agent unavailable', detail: String(e) }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
export const PATCH = proxy
