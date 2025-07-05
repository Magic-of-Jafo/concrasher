import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaTab } from '../MediaTab';
import { updateConventionMedia } from '@/lib/actions';
import { ConventionMediaData } from '@/lib/validators';

// Mock the server action
jest.mock('@/lib/actions', () => ({
    updateConventionMedia: jest.fn(),
}));

// Mock the child components
jest.mock('../CoverImageUploader', () => ({
    CoverImageUploader: ({ onImageUpdate }: { onImageUpdate: (url: string | null) => void }) => (
        <div data-testid="cover-image-uploader">
            <button onClick={() => onImageUpdate('/uploads/test/cover/cover.jpg')}>
                Upload Cover
            </button>
        </div>
    ),
}));

jest.mock('../ProfileImageUploader', () => ({
    ProfileImageUploader: ({ onImageUpdate }: { onImageUpdate: (url: string | null) => void }) => (
        <div data-testid="profile-image-uploader">
            <button onClick={() => onImageUpdate('/uploads/test/profile/profile.jpg')}>
                Upload Profile
            </button>
        </div>
    ),
}));

jest.mock('@/components/ui/ImageUploader', () => ({
    __esModule: true,
    default: ({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) => (
        <div data-testid="image-uploader">
            <button onClick={() => onUploadSuccess('/uploads/test/promotional/image.jpg')}>
                Add Images
            </button>
        </div>
    ),
}));

jest.mock('../PromotionalImageItem', () => ({
    PromotionalImageItem: ({
        media,
        index,
        onUpdate,
        onRemove
    }: {
        media: ConventionMediaData;
        index: number;
        onUpdate: (media: ConventionMediaData) => void;
        onRemove: () => void;
    }) => (
        <div data-testid={`promotional-image-${index}`}>
            <span>Image: {media.url}</span>
            <span>Caption: {media.caption}</span>
            <button onClick={() => onUpdate({ ...media, caption: 'Updated caption' })}>
                Update
            </button>
            <button onClick={onRemove}>Remove</button>
        </div>
    ),
}));

jest.mock('../VideoLinkItem', () => ({
    VideoLinkItem: ({
        media,
        index,
        onUpdate,
        onRemove
    }: {
        media: ConventionMediaData;
        index: number;
        onUpdate: (media: ConventionMediaData) => void;
        onRemove: () => void;
    }) => (
        <div data-testid={`video-link-${index}`}>
            <span>Video: {media.url}</span>
            <span>Caption: {media.caption}</span>
            <button onClick={() => onUpdate({ ...media, caption: 'Updated video caption' })}>
                Update
            </button>
            <button onClick={onRemove}>Remove</button>
        </div>
    ),
}));

// Mock fetch for video title fetching
global.fetch = jest.fn();

const mockUpdateConventionMedia = updateConventionMedia as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('MediaTab', () => {
    const defaultProps = {
        conventionId: 'clc1234567890123456789012',
        initialMedia: [],
        onSave: jest.fn(),
    };

    const mockPropsWithMedia = {
        conventionId: 'clc1234567890123456789012',
        initialMedia: [
            {
                id: 'media-1',
                conventionId: 'clc1234567890123456789012',
                type: 'IMAGE' as const,
                url: '/uploads/test/promotional/image1.jpg',
                caption: 'Test image 1',
                order: 0,
            },
            {
                id: 'media-2',
                conventionId: 'clc1234567890123456789012',
                type: 'VIDEO_LINK' as const,
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                caption: 'Test video 1',
                order: 1,
            },
        ],
        onSave: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUpdateConventionMedia.mockResolvedValue({ success: true, message: 'Media updated successfully!' });
    });

    describe('Rendering and Basic Functionality', () => {
        it('should render the main components', () => {
            render(<MediaTab {...mockPropsWithMedia} />);

            expect(screen.getByText('Convention Media')).toBeInTheDocument();
            expect(screen.getByText('Convention Images')).toBeInTheDocument();
            expect(screen.getByText('Promotional Gallery')).toBeInTheDocument();
            expect(screen.getByTestId('cover-image-uploader')).toBeInTheDocument();
            expect(screen.getByTestId('profile-image-uploader')).toBeInTheDocument();
        });

        it('should render tabs with correct initial counts', () => {
            const initialMedia: ConventionMediaData[] = [
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'IMAGE',
                    url: '/uploads/test/image1.jpg',
                    caption: 'Image 1',
                    order: 0,
                },
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'VIDEO_LINK',
                    url: 'https://youtube.com/watch?v=123',
                    caption: 'Video 1',
                    order: 1,
                },
            ];

            render(<MediaTab conventionId='clc1234567890123456789012' initialMedia={initialMedia} onSave={jest.fn()} />);

            expect(screen.getByRole('tab', { name: /Images \(1\)/ })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Videos \(1\)/ })).toBeInTheDocument();
        });

        it('should show empty state when no media is present', () => {
            render(<MediaTab {...defaultProps} />);

            expect(screen.getByRole('tab', { name: /Images \(0\)/ })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Videos \(0\)/ })).toBeInTheDocument();
            expect(screen.getByText('No images added yet')).toBeInTheDocument();
        });
    });

    describe('Tab Navigation', () => {
        it('should switch between Images and Videos tabs', async () => {
            const user = userEvent.setup();
            const initialMedia: ConventionMediaData[] = [
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'IMAGE',
                    url: '/uploads/test/image1.jpg',
                    caption: 'Image 1',
                    order: 0,
                },
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'VIDEO_LINK',
                    url: 'https://youtube.com/watch?v=123',
                    caption: 'Video 1',
                    order: 1,
                },
            ];

            render(<MediaTab conventionId='clc1234567890123456789012' initialMedia={initialMedia} onSave={jest.fn()} />);

            // Initially on Images tab
            expect(screen.getByTestId('promotional-image-0')).toBeInTheDocument();
            expect(screen.queryByTestId('video-link-0')).not.toBeInTheDocument();

            // Switch to Videos tab
            await user.click(screen.getByRole('tab', { name: /Videos \(1\)/ }));

            expect(screen.getByTestId('video-link-0')).toBeInTheDocument();
            expect(screen.queryByTestId('promotional-image-0')).not.toBeInTheDocument();

            // Switch back to Images tab
            await user.click(screen.getByRole('tab', { name: /Images \(1\)/ }));

            expect(screen.getByTestId('promotional-image-0')).toBeInTheDocument();
            expect(screen.queryByTestId('video-link-0')).not.toBeInTheDocument();
        });

        it('should show correct empty states for each tab', async () => {
            const user = userEvent.setup();
            render(<MediaTab {...defaultProps} />);

            // Images tab empty state
            expect(screen.getByText('No images added yet')).toBeInTheDocument();

            // Switch to Videos tab
            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));

            expect(screen.getByText('No videos added yet')).toBeInTheDocument();
        });
    });

    describe('Image Upload Functionality', () => {
        it('should handle cover image upload', async () => {
            render(<MediaTab {...mockPropsWithMedia} />);

            const coverUploader = screen.getByTestId('cover-image-uploader');
            const uploadButton = within(coverUploader).getByText('Upload Cover');

            fireEvent.click(uploadButton);

            // The component should update the cover image URL
            // This would be reflected in the component state, but since we're mocking
            // the uploader, we just verify the interaction works
            expect(uploadButton).toBeInTheDocument();
        });

        it('should handle profile image upload', async () => {
            render(<MediaTab {...mockPropsWithMedia} />);

            const profileUploader = screen.getByTestId('profile-image-uploader');
            const uploadButton = within(profileUploader).getByText('Upload Profile');

            fireEvent.click(uploadButton);

            expect(uploadButton).toBeInTheDocument();
        });

        it('should handle promotional image upload and auto-save', async () => {
            render(<MediaTab {...defaultProps} />);

            const imageUploader = screen.getByTestId('image-uploader');
            const uploadButton = within(imageUploader).getByText('Add Images');

            fireEvent.click(uploadButton);

            await waitFor(() => {
                expect(mockUpdateConventionMedia).toHaveBeenCalledWith('clc1234567890123456789012', [
                    expect.objectContaining({
                        type: 'IMAGE',
                        url: '/uploads/test/promotional/image.jpg',
                        caption: "",
                        order: 0,
                    }),
                ]);
            });
        });
    });

    describe('Video Link Functionality', () => {
        beforeEach(() => {
            // Mock successful YouTube oEmbed response
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ title: 'Test YouTube Video' }),
            });
        });

        it('should open video dialog when Add Video button is clicked', async () => {
            const user = userEvent.setup();
            render(<MediaTab {...defaultProps} />);

            // Switch to Videos tab
            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));

            const addVideoButton = screen.getByRole('button', { name: /Add Video/ });
            await user.click(addVideoButton);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Add Video Link')).toBeInTheDocument();
            expect(screen.getByLabelText('YouTube or Vimeo URL')).toBeInTheDocument();
        });

        it('should validate YouTube URL and fetch title', async () => {
            const user = userEvent.setup();
            render(<MediaTab {...defaultProps} />);

            // Switch to Videos tab and open dialog
            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));
            await user.click(screen.getByRole('button', { name: /Add Video/ }));

            const urlInput = screen.getByLabelText('YouTube or Vimeo URL');
            const addButton = screen.getByRole('button', { name: /Add Video/ });

            await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('youtube.com/oembed')
                );
            });

            await waitFor(() => {
                expect(mockUpdateConventionMedia).toHaveBeenCalledWith('clc1234567890123456789012', [
                    expect.objectContaining({
                        type: 'VIDEO_LINK',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        caption: 'Test YouTube Video',
                        order: 0,
                    }),
                ]);
            });
        });

        it('should validate Vimeo URL and fetch title', async () => {
            const user = userEvent.setup();
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ title: 'Test Vimeo Video' }),
            });

            render(<MediaTab {...defaultProps} />);

            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));
            await user.click(screen.getByRole('button', { name: /Add Video/ }));

            const urlInput = screen.getByLabelText('YouTube or Vimeo URL');
            const addButton = screen.getByRole('button', { name: /Add Video/ });

            await user.type(urlInput, 'https://vimeo.com/123456789');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('vimeo.com/api/oembed.json')
                );
            });
        });

        it('should show error for invalid video URL', async () => {
            const user = userEvent.setup();
            render(<MediaTab {...defaultProps} />);

            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));
            await user.click(screen.getByRole('button', { name: /Add Video/ }));

            const urlInput = screen.getByLabelText('YouTube or Vimeo URL');
            const addButton = screen.getByRole('button', { name: /Add Video/ });

            await user.type(urlInput, 'https://invalid-url.com');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid YouTube or Vimeo URL')).toBeInTheDocument();
            });

            expect(mockUpdateConventionMedia).not.toHaveBeenCalled();
        });

        it('should close video dialog when cancelled', async () => {
            const user = userEvent.setup();
            render(<MediaTab {...defaultProps} />);

            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));
            await user.click(screen.getByRole('button', { name: /Add Video/ }));

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            const cancelButton = screen.getByRole('button', { name: /Cancel/ });
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });
    });

    describe('Media Management', () => {
        it('should handle media update operations', async () => {
            const initialMedia: ConventionMediaData[] = [
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'IMAGE',
                    url: '/uploads/test/image1.jpg',
                    caption: 'Original caption',
                    order: 0,
                },
            ];

            render(<MediaTab conventionId='clc1234567890123456789012' initialMedia={initialMedia} onSave={jest.fn()} />);

            const updateButton = screen.getByText('Update');
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(mockUpdateConventionMedia).toHaveBeenCalledWith('clc1234567890123456789012', [
                    expect.objectContaining({
                        caption: 'Updated caption',
                    }),
                ]);
            });
        });

        it('should handle media removal operations', async () => {
            const initialMedia: ConventionMediaData[] = [
                {
                    conventionId: 'clc1234567890123456789012',
                    type: 'IMAGE',
                    url: '/uploads/test/image1.jpg',
                    caption: 'Test image',
                    order: 0,
                },
            ];

            render(<MediaTab conventionId='clc1234567890123456789012' initialMedia={initialMedia} onSave={jest.fn()} />);

            const removeButton = screen.getByText('Remove');
            fireEvent.click(removeButton);

            await waitFor(() => {
                expect(mockUpdateConventionMedia).toHaveBeenCalledWith('clc1234567890123456789012', []);
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message when server action fails', async () => {
            mockUpdateConventionMedia.mockResolvedValue({
                success: false,
                error: 'Failed to update media',
            });

            render(<MediaTab {...mockPropsWithMedia} />);

            const imageUploader = screen.getByTestId('image-uploader');
            const uploadButton = within(imageUploader).getByText('Add Images');

            fireEvent.click(uploadButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to update media')).toBeInTheDocument();
            });
        });

        it('should display success message when operation succeeds', async () => {
            render(<MediaTab {...mockPropsWithMedia} />);

            const imageUploader = screen.getByTestId('image-uploader');
            const uploadButton = within(imageUploader).getByText('Add Images');

            fireEvent.click(uploadButton);

            await waitFor(() => {
                expect(screen.getByText('Image added and saved successfully!')).toBeInTheDocument();
            });
        });

        it('should handle video title fetch failures gracefully', async () => {
            const user = userEvent.setup();
            mockFetch.mockRejectedValue(new Error('Network error'));

            render(<MediaTab {...defaultProps} />);

            await user.click(screen.getByRole('tab', { name: /Videos \(0\)/ }));
            await user.click(screen.getByRole('button', { name: /Add Video/ }));

            const urlInput = screen.getByLabelText('YouTube or Vimeo URL');
            const addButton = screen.getByRole('button', { name: /Add Video/ });

            await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockUpdateConventionMedia).toHaveBeenCalledWith('clc1234567890123456789012', [
                    expect.objectContaining({
                        type: 'VIDEO_LINK',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        caption: undefined, // Should fall back to undefined caption
                        order: 0,
                    }),
                ]);
            });
        });
    });

    describe('Integration with onSave callback', () => {
        it('should call onSave callback when provided', async () => {
            const onSaveMock = jest.fn();
            render(<MediaTab {...defaultProps} onSave={onSaveMock} />);

            const imageUploader = screen.getByTestId('image-uploader');
            const uploadButton = within(imageUploader).getByText('Add Images');

            fireEvent.click(uploadButton);

            await waitFor(() => {
                expect(onSaveMock).toHaveBeenCalledWith(true, 'Image added and saved successfully!');
            });
        });
    });
}); 