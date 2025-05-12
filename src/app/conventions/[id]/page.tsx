import { notFound } from 'next/navigation';
import { getConventionById } from '@/lib/api';
import ConventionDetail from './ConventionDetail';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ConventionPage({ params }: PageProps) {
  try {
    const convention = await getConventionById(params.id);
    
    if (!convention) {
      notFound();
    }

    return <ConventionDetail convention={convention} />;
  } catch (error) {
    throw error; // This will be caught by the error boundary
  }
} 