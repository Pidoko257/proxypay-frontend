/**
 * Bookmark Manager
 * Handles persistence of bookmarked endpoints to localStorage
 */

export interface Bookmark {
  id: string;
  path: string;
  method: string;
  summary: string;
  tag?: string;
  createdAt: number;
}

const BOOKMARKS_KEY = 'proxypay_api_bookmarks';
const MAX_BOOKMARKS = 100;

export class BookmarkManager {
  /**
   * Get all bookmarks from localStorage
   */
  static getBookmarks(): Bookmark[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = window.localStorage.getItem(BOOKMARKS_KEY);
      if (!stored) return [];
      
      const bookmarks = JSON.parse(stored) as Bookmark[];
      return Array.isArray(bookmarks) ? bookmarks : [];
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      return [];
    }
  }

  /**
   * Check if an endpoint is bookmarked
   */
  static isBookmarked(endpointId: string): boolean {
    return this.getBookmarks().some(b => b.id === endpointId);
  }

  /**
   * Add a bookmark
   */
  static addBookmark(bookmark: Omit<Bookmark, 'createdAt'>): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const bookmarks = this.getBookmarks();
      
      // Check if already bookmarked
      if (bookmarks.some(b => b.id === bookmark.id)) {
        return false;
      }

      // Enforce max bookmarks
      if (bookmarks.length >= MAX_BOOKMARKS) {
        // Remove oldest bookmark
        bookmarks.sort((a, b) => a.createdAt - b.createdAt);
        bookmarks.shift();
      }

      const newBookmark: Bookmark = {
        ...bookmark,
        createdAt: Date.now(),
      };

      bookmarks.push(newBookmark);
      window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true;
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      return false;
    }
  }

  /**
   * Remove a bookmark
   */
  static removeBookmark(endpointId: string): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const bookmarks = this.getBookmarks();
      const filtered = bookmarks.filter(b => b.id !== endpointId);

      if (filtered.length === bookmarks.length) {
        return false; // Not found
      }

      window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      return false;
    }
  }

  /**
   * Toggle bookmark (add or remove)
   */
  static toggleBookmark(bookmark: Omit<Bookmark, 'createdAt'>): boolean {
    if (this.isBookmarked(bookmark.id)) {
      return this.removeBookmark(bookmark.id);
    } else {
      return this.addBookmark(bookmark);
    }
  }

  /**
   * Clear all bookmarks
   */
  static clearAll(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.removeItem(BOOKMARKS_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear bookmarks:', error);
      return false;
    }
  }

  /**
   * Get count of bookmarks
   */
  static getCount(): number {
    return this.getBookmarks().length;
  }
}
