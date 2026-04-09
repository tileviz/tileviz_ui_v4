// ============================================================
//  utils/trie.ts — Trie data structure for optimized searching
//  Provides O(m) prefix matching where m is query length
// ============================================================

export interface TrieNode {
  children: Map<string, TrieNode>;
  items: Set<string>; // Store item IDs at each node
  isEndOfWord: boolean;
}

export class Trie {
  private root: TrieNode;
  private itemsMap: Map<string, any>; // Map of item ID to actual item

  constructor() {
    this.root = this.createNode();
    this.itemsMap = new Map();
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      items: new Set(),
      isEndOfWord: false,
    };
  }

  /**
   * Insert a word associated with an item ID into the trie
   */
  private insertWord(word: string, itemId: string): void {
    let node = this.root;
    const normalizedWord = word.toLowerCase();

    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode());
      }
      node = node.children.get(char)!;
      node.items.add(itemId); // Add item to every node in the path
    }
    node.isEndOfWord = true;
  }

  /**
   * Index an item with multiple searchable fields
   */
  indexItem(item: any, searchableFields: string[]): void {
    const itemId = item.id || JSON.stringify(item);
    this.itemsMap.set(itemId, item);

    // Index each searchable field
    searchableFields.forEach(field => {
      const value = item[field];
      if (value) {
        const words = String(value).split(/\s+/); // Split into words
        words.forEach(word => {
          if (word.trim()) {
            this.insertWord(word.trim(), itemId);
          }
        });
      }
    });
  }

  /**
   * Build trie from array of items
   */
  buildIndex<T>(items: T[], searchableFields: (keyof T)[]): void {
    this.clear();
    items.forEach(item => {
      this.indexItem(item, searchableFields as string[]);
    });
  }

  /**
   * Search for items matching a prefix query
   */
  search(query: string): any[] {
    if (!query || !query.trim()) {
      return Array.from(this.itemsMap.values());
    }

    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);

    // For multi-word queries, find intersection of results
    if (words.length > 1) {
      const resultSets = words.map(word => this.searchWord(word));
      const intersection = this.intersectSets(resultSets);
      return Array.from(intersection).map(id => this.itemsMap.get(id)).filter(Boolean);
    }

    // Single word search
    const itemIds = this.searchWord(normalizedQuery);
    return Array.from(itemIds).map(id => this.itemsMap.get(id)).filter(Boolean);
  }

  /**
   * Search for a single word prefix
   */
  private searchWord(word: string): Set<string> {
    let node = this.root;

    // Traverse the trie for the query prefix
    for (const char of word) {
      if (!node.children.has(char)) {
        return new Set(); // No matches
      }
      node = node.children.get(char)!;
    }

    // Return all items under this node
    return node.items;
  }

  /**
   * Find intersection of multiple sets (for multi-word queries)
   */
  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set();
    if (sets.length === 1) return sets[0];

    let result = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      result = new Set([...result].filter(x => sets[i].has(x)));
    }
    return result;
  }

  /**
   * Clear the trie
   */
  clear(): void {
    this.root = this.createNode();
    this.itemsMap.clear();
  }

  /**
   * Get all indexed items
   */
  getAllItems(): any[] {
    return Array.from(this.itemsMap.values());
  }

  /**
   * Get count of indexed items
   */
  size(): number {
    return this.itemsMap.size;
  }
}

/**
 * Create a search hook for easy integration
 */
export function createTrieSearch<T>(
  items: T[],
  searchableFields: (keyof T)[]
): {
  search: (query: string) => T[];
  rebuild: (newItems: T[]) => void;
  clear: () => void;
} {
  const trie = new Trie();
  trie.buildIndex(items, searchableFields);

  return {
    search: (query: string) => trie.search(query),
    rebuild: (newItems: T[]) => trie.buildIndex(newItems, searchableFields),
    clear: () => trie.clear(),
  };
}

