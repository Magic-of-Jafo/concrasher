import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://conventioncrasher.com'

    // Get all published conventions that haven't expired
    const conventions = await db.convention.findMany({
        where: {
            status: 'PUBLISHED',
            startDate: {
                gte: new Date()
            },
            // Exclude conventions that have ended (endDate is in the past)
            endDate: {
                gte: new Date()
            },
            // Exclude deleted conventions
            deletedAt: null
        },
        select: {
            id: true,
            slug: true,
            updatedAt: true
        }
    })

    // Static pages
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1
        },
        {
            url: `${baseUrl}/conventions`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9
        },
        {
            url: `${baseUrl}/organizer/apply`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.7
        },
        {
            url: `${baseUrl}/auth/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5
        },
        {
            url: `${baseUrl}/auth/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5
        }
    ]

    // Convention pages
    const conventionPages = conventions.map((convention: { slug: string; updatedAt: Date }) => ({
        url: `${baseUrl}/conventions/${convention.slug}`,
        lastModified: convention.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8
    }))

    return [...staticPages, ...conventionPages]
} 