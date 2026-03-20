import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  const body = await request.json()
  const { type, handle } = body

  if (type === 'product' && handle) {
    revalidatePath(`/products/${handle}`)
  } else if (type === 'collection' && handle) {
    revalidatePath(`/collections/${handle}`)
  } else {
    revalidatePath('/')
  }

  return NextResponse.json({ revalidated: true, now: Date.now() })
}
