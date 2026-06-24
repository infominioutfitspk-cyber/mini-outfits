import { NextRequest, NextResponse } from 'next/server';
import { getGlobalReviews } from '@/lib/services/reviews';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined;
  const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'highest' | 'lowest';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const result = await getGlobalReviews({ search, rating, sort, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /api/reviews/global failed:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
