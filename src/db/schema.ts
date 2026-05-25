import Dexie, { type Table } from 'dexie'
import type { Memo, Blog, GalleryPhoto, Notebook } from '../types'

class NaccDatabase extends Dexie {
  memos!: Table<Memo, number>
  blogs!: Table<Blog, number>
  gallery!: Table<GalleryPhoto, number>
  notebooks!: Table<Notebook, number>

  constructor() {
    super('NaccDB')
    this.version(1).stores({
      memos:     '++id, title, updatedAt',
      blogs:     '++id, title, mode, deletedAt, updatedAt',
      gallery:   '++id, createdAt',
      notebooks: '++id, title, updatedAt',
    })
  }
}

export const db = new NaccDatabase()
