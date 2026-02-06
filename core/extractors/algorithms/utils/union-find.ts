/**
 * Union-Find Data Structure (Disjoint Set Union)
 * 
 * Efficiently manages a set of elements partitioned into disjoint sets.
 * Supports path compression and union by rank (simplified).
 */
export class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = new Array(size).fill(0).map((_, i) => i);
  }

  /**
   * Find the representative (root) of the set containing element i.
   * Uses path compression for O(α(N)) complexity.
   */
  find(i: number): number {
    if (this.parent[i] === i) return i;
    // Path compression: Point directly to the root
    return (this.parent[i] = this.find(this.parent[i]));
  }

  /**
   * Union the sets containing elements i and j.
   */
  union(i: number, j: number): void {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }

  /**
   * Returns a Map where keys are root indices and values are arrays of element indices.
   */
  getGroups(): Map<number, number[]> {
    const groups = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(i);
    }
    return groups;
  }
}
