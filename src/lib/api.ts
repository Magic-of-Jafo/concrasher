import prisma from './prisma';
import { Convention } from '@prisma/client';

export async function getConventionById(id: string): Promise<Convention | null> {
  try {
    const convention = await prisma.convention.findUnique({
      where: { id },
    });

    return convention;
  } catch (error) {
    console.error('Error fetching convention:', error);
    throw new Error('Failed to fetch convention details');
  }
}

export async function getAllConventions(): Promise<Convention[]> {
  try {
    const conventions = await prisma.convention.findMany({
      orderBy: {
        startDate: 'desc'
      }
    });

    return conventions;
  } catch (error) {
    console.error('Error fetching conventions:', error);
    throw new Error('Failed to fetch conventions');
  }
} 