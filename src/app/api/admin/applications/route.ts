import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApplications, approveApplication, rejectApplication } from '@/lib/applications';
import type { ApplicationActionRequest } from '@/types/applications';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.roles?.includes('ADMIN')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const applications = await getApplications();
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.roles?.includes('ADMIN')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { action, applicationId } = await request.json() as ApplicationActionRequest;

    if (!action || !applicationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await approveApplication(applicationId);
        break;
      case 'reject':
        result = await rejectApplication(applicationId);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing application:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 