import { NextRequest, NextResponse } from 'next/server';
import { submitAdminCustomReview } from '@/lib/services/reviews';
import { submitSocialProof, updateSocialProof } from '@/lib/services/socialProof';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'social_proof') {
      const proof = await submitSocialProof({
        imageUrl: data.imageUrl,
        caption: data.caption,
        sourceType: data.sourceType || 'manual',
        productIds: data.productIds
      });
      return NextResponse.json({ success: true, data: proof });
    }

    const review = await submitAdminCustomReview({
      productId: data.productId || null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      rating: data.rating,
      comment: data.comment,
      screenshotUrl: data.screenshotUrl
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error: any) {
    console.error('[API] POST /api/reviews/admin-custom failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, ...data } = body;

    if (type === 'social_proof' && id) {
      const proof = await updateSocialProof(id, {
        imageUrl: data.imageUrl,
        caption: data.caption,
        sourceType: data.sourceType,
        productIds: data.productIds
      });
      return NextResponse.json({ success: true, data: proof });
    }

    return NextResponse.json({ error: 'Invalid update request' }, { status: 400 });
  } catch (error: any) {
    console.error('[API] PUT /api/reviews/admin-custom failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}
