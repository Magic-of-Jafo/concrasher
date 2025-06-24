import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addScheduleDay } from '@/lib/actions';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const conventionId = params.id;
  if (!conventionId) {
    return new Response(JSON.stringify({ days: [], error: 'Missing conventionId' }), { status: 400 });
  }
  try {
    const days = await db.scheduleDay.findMany({
      where: { conventionId },
      orderBy: { dayOffset: 'asc' },
    });
    return new Response(JSON.stringify({ days }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ days: [], error: 'Failed to fetch schedule days' }), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const conventionId = params.id;
  if (!conventionId) {
    return NextResponse.json({ success: false, error: 'Missing conventionId' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { dayOffset } = body;

    if (typeof dayOffset !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid or missing dayOffset in request body. Must be a number.' }, { status: 400 });
    }

    // Potentially, you could add session validation here too if needed,
    // though the action itself also performs it.
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    // }

    const result = await addScheduleDay(conventionId, dayOffset);

    if (!result.success) {
      return NextResponse.json(result, { status: result.error?.includes('already exists') ? 409 : 500 });
    }

    return NextResponse.json(result, { status: 201 }); // 201 Created for successful creation

  } catch (error) {
    console.error("Error in POST /schedule-days:", error);
    if (error instanceof SyntaxError) { // Handle cases where req.json() fails
        return NextResponse.json({ success: false, error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
} 