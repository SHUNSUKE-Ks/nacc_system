import type { GalleryItem } from './types'

export const GALLERY_SAMPLE: GalleryItem[] = [
  {
    id: 'g001',
    filename: 'vitamin_c_1000mg.jpg',
    label: 'ビタミンC 1000mg',
    description: 'Source Naturals社のビタミンCサプリ。免疫サポートと抗酸化作用。アスコルビン酸・バイオフラボノイド配合。',
    tags: ['ビタミン', 'サプリ', '免疫', '抗酸化'],
    category: 'product',
    mimeType: 'image/jpeg',
    fileSize: 245760,
    width: 800,
    height: 800,
    url: 'https://picsum.photos/seed/vitaminc/400',
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-05-10'),
  },
]
