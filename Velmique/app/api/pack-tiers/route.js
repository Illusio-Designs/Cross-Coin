import { getPackTiers } from '@/lib/api/bundles';

export const revalidate = 300;

export async function GET() {
  return Response.json(await getPackTiers());
}
