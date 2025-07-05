import { ConventionMediaSchema, ConventionMediaData } from '../validators';

// Mock fetch for testing video title fetching
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('Media Validation and Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ConventionMediaSchema Validation', () => {
        const validImageMedia = {
            conventionId: 'clc1234567890123456789012',
            type: 'IMAGE' as const,
            url: '/uploads/clc1234567890123456789012/promotional/image.jpg',
            caption: 'Test image caption',
            order: 0,
        };

        const validVideoMedia = {
            conventionId: 'clc1234567890123456789012',
            type: 'VIDEO_LINK' as const,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            caption: 'Test video caption',
            order: 1,
        };

        describe('Valid Data', () => {
            it('should validate correct image media data', () => {
                const result = ConventionMediaSchema.safeParse(validImageMedia);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(validImageMedia);
                }
            });

            it('should validate correct video media data', () => {
                const result = ConventionMediaSchema.safeParse(validVideoMedia);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).toEqual(validVideoMedia);
                }
            });

            it('should handle optional ID field', () => {
                const mediaWithId = {
                    ...validImageMedia,
                    id: 'clm1234567890123456789012',
                };

                const result = ConventionMediaSchema.safeParse(mediaWithId);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.id).toBe('clm1234567890123456789012');
                }
            });

            it('should handle undefined caption', () => {
                const mediaWithoutCaption = {
                    ...validImageMedia,
                    caption: undefined,
                };

                const result = ConventionMediaSchema.safeParse(mediaWithoutCaption);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.caption).toBeUndefined();
                }
            });

            it('should transform null caption to undefined', () => {
                const mediaWithNullCaption = {
                    ...validImageMedia,
                    caption: null,
                };

                const result = ConventionMediaSchema.safeParse(mediaWithNullCaption);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.caption).toBeUndefined();
                }
            });

            it('should handle empty string caption', () => {
                const mediaWithEmptyCaption = {
                    ...validImageMedia,
                    caption: '',
                };

                const result = ConventionMediaSchema.safeParse(mediaWithEmptyCaption);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.caption).toBeUndefined();
                }
            });
        });

        describe('URL Validation', () => {
            it('should accept valid image upload URLs', () => {
                const validUrls = [
                    '/uploads/clc1234567890123456789012/promotional/image.jpg',
                    '/uploads/clc1234567890123456789012/cover/cover.png',
                    '/uploads/clc1234567890123456789012/profile/profile.webp',
                ];

                validUrls.forEach(url => {
                    const media = { ...validImageMedia, url };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should accept valid YouTube URLs', () => {
                const validYouTubeUrls = [
                    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://youtu.be/dQw4w9WgXcQ',
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    'https://youtube-nocookie.com/embed/dQw4w9WgXcQ',
                ];

                validYouTubeUrls.forEach(url => {
                    const media = { ...validVideoMedia, url };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should accept valid Vimeo URLs', () => {
                const validVimeoUrls = [
                    'https://vimeo.com/123456789',
                    'https://vimeo.com/video/123456789',
                    'https://player.vimeo.com/video/123456789',
                ];

                validVimeoUrls.forEach(url => {
                    const media = { ...validVideoMedia, url };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should reject invalid URLs', () => {
                const invalidUrls = [
                    '',
                    'invalid-url',
                    'https://invalid-domain.com/video',
                    'ftp://example.com/file.mp4',
                    'relative/path/without/uploads',
                ];

                invalidUrls.forEach(url => {
                    const media = { ...validImageMedia, url };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(false);
                });
            });
        });

        describe('Type Validation', () => {
            it('should accept valid media types', () => {
                const validTypes = ['IMAGE', 'VIDEO_LINK'] as const;

                validTypes.forEach(type => {
                    const media = { ...validImageMedia, type };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should reject invalid media types', () => {
                const invalidTypes = ['AUDIO', 'DOCUMENT', 'VIDEO', ''];

                invalidTypes.forEach(type => {
                    const media = { ...validImageMedia, type };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(false);
                });
            });
        });

        describe('Order Validation', () => {
            it('should accept valid order numbers', () => {
                const validOrders = [0, 1, 5, 100];

                validOrders.forEach(order => {
                    const media = { ...validImageMedia, order };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should reject negative order numbers', () => {
                const invalidOrders = [-1, -5, -100];

                invalidOrders.forEach(order => {
                    const media = { ...validImageMedia, order };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(false);
                });
            });

            it('should reject non-integer order numbers', () => {
                const invalidOrders = [1.5, 2.7, Math.PI];

                invalidOrders.forEach(order => {
                    const media = { ...validImageMedia, order };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(false);
                });
            });
        });

        describe('Convention ID Validation', () => {
            it('should accept valid cuid convention IDs', () => {
                const validCuids = [
                    'cl9ebqhxk00008eqt33r3r3r3',
                    'convention123',
                    'cmash9ood003reirghnb26oht',
                ];

                validCuids.forEach(conventionId => {
                    const media = { ...validImageMedia, conventionId };
                    const result = ConventionMediaSchema.safeParse(media);
                    expect(result.success).toBe(true);
                });
            });

            it('should handle optional convention ID', () => {
                const { conventionId, ...mediaWithoutConventionId } = validImageMedia;
                const result = ConventionMediaSchema.safeParse(mediaWithoutConventionId);
                expect(result.success).toBe(true);
            });
        });

        describe('Validation with Missing conventionId', () => {
            it('should pass when conventionId is missing (since it is optional)', () => {
                const mediaWithoutConventionId = {
                    type: 'IMAGE' as const,
                    url: '/uploads/clc1234567890123456789012/promotional/image.jpg',
                    caption: 'Test image caption',
                    order: 0,
                };

                const result = ConventionMediaSchema.safeParse(mediaWithoutConventionId);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.conventionId).toBeUndefined();
                }
            });
        });
    });

    describe('Video Title Fetching Utilities', () => {
        describe('YouTube URL Pattern Recognition', () => {
            it('should match various YouTube URL formats', () => {
                const youtubeUrls = [
                    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://youtu.be/dQw4w9WgXcQ',
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    'https://youtube-nocookie.com/embed/dQw4w9WgXcQ',
                ];

                const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

                youtubeUrls.forEach(url => {
                    const match = url.match(youtubeRegex);
                    expect(match).toBeTruthy();
                    expect(match![1]).toBe('dQw4w9WgXcQ');
                });
            });

            it('should not match invalid YouTube URLs', () => {
                const invalidUrls = [
                    'https://youtube.com/channel/UC123',
                    'https://vimeo.com/123456',
                    'https://youtube.com/playlist?list=PL123',
                    'https://youtube.com',
                ];

                const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

                invalidUrls.forEach(url => {
                    const match = url.match(youtubeRegex);
                    expect(match).toBeFalsy();
                });
            });
        });

        describe('Vimeo URL Pattern Recognition', () => {
            it('should match various Vimeo URL formats', () => {
                const vimeoUrls = [
                    'https://vimeo.com/123456789',
                    'https://vimeo.com/video/123456789',
                    'https://player.vimeo.com/video/123456789',
                ];

                const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

                vimeoUrls.forEach(url => {
                    const match = url.match(vimeoRegex);
                    expect(match).toBeTruthy();
                    expect(match![1]).toBe('123456789');
                });
            });

            it('should not match invalid Vimeo URLs', () => {
                const invalidUrls = [
                    'https://vimeo.com/user/username',
                    'https://youtube.com/watch?v=123',
                    'https://vimeo.com/channels/channel',
                    'https://vimeo.com',
                ];

                const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

                invalidUrls.forEach(url => {
                    const match = url.match(vimeoRegex);
                    expect(match).toBeFalsy();
                });
            });
        });
    });

    describe('Caption Sanitization', () => {
        it('should sanitize video titles correctly', () => {
            const testCases = [
                { input: 'Title with 🎉 emojis 🎬 and àccénts', expected: 'Title with emojis and accents' },
                { input: 'Regular title', expected: 'Regular title' },
                { input: 'Title with "quotes" and \'apostrophes\'', expected: 'Title with quotes and apostrophes' },
                { input: 'Title with <script>alert("xss")</script>', expected: 'Title with alert(xss)' },
                { input: 'Title with symbols: @#$%^&*()+=[]{}|;:,.<>?', expected: 'Title with symbols: @#$%^&*()+=[]{}|;:,.<>?' },
            ];

            testCases.forEach(({ input, expected }) => {
                const sanitized = input
                    .replace(/[^\w\s\-_.,:;!?@#$%^&*()+=\[\]{}|<>]/g, '') // Remove special chars but keep common punctuation
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim()
                    .substring(0, 500); // Limit length

                expect(sanitized).toBe(expected);
            });
        });
    });

    describe('Media Array Operations', () => {
        it('should correctly separate images and videos', () => {
            const mixedMedia: ConventionMediaData[] = [
                {
                    conventionId: 'test',
                    type: 'IMAGE',
                    url: '/uploads/image1.jpg',
                    caption: 'Image 1',
                    order: 0,
                },
                {
                    conventionId: 'test',
                    type: 'VIDEO_LINK',
                    url: 'https://youtube.com/watch?v=123',
                    caption: 'Video 1',
                    order: 1,
                },
                {
                    conventionId: 'test',
                    type: 'IMAGE',
                    url: '/uploads/image2.jpg',
                    caption: 'Image 2',
                    order: 2,
                },
            ];

            const images = mixedMedia.filter(m => m.type === 'IMAGE');
            const videos = mixedMedia.filter(m => m.type === 'VIDEO_LINK');

            expect(images).toHaveLength(2);
            expect(videos).toHaveLength(1);
            expect(images[0].url).toBe('/uploads/image1.jpg');
            expect(images[1].url).toBe('/uploads/image2.jpg');
            expect(videos[0].url).toBe('https://youtube.com/watch?v=123');
        });

        it('should handle empty arrays correctly', () => {
            const emptyMedia: ConventionMediaData[] = [];

            const images = emptyMedia.filter(m => m.type === 'IMAGE');
            const videos = emptyMedia.filter(m => m.type === 'VIDEO_LINK');

            expect(images).toHaveLength(0);
            expect(videos).toHaveLength(0);
        });

        it('should calculate correct order values for new media', () => {
            const existingMedia: ConventionMediaData[] = [
                {
                    conventionId: 'test',
                    type: 'IMAGE',
                    url: '/uploads/image1.jpg',
                    caption: 'Image 1',
                    order: 0,
                },
                {
                    conventionId: 'test',
                    type: 'IMAGE',
                    url: '/uploads/image2.jpg',
                    caption: 'Image 2',
                    order: 1,
                },
            ];

            const images = existingMedia.filter(m => m.type === 'IMAGE');
            const videos = existingMedia.filter(m => m.type === 'VIDEO_LINK');

            // New image should get order = images.length (2)
            const newImageOrder = images.length;
            expect(newImageOrder).toBe(2);

            // New video should get order = videos.length (0)
            const newVideoOrder = videos.length;
            expect(newVideoOrder).toBe(0);
        });
    });
}); 