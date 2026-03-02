// Custom Dexie type declarations to avoid TS1540 error
// This replaces the problematic dexie.d.ts that uses 'module' keyword

declare module 'dexie' {
  class Dexie {
    constructor(databaseName: string, options?: any);
    version(versionNumber: number): any;
    open(): Promise<Dexie>;
    close(): void;
    delete(): Promise<void>;
    table<T = any>(tableName: string): Table<T>;
    on: any;
    [key: string]: any;
  }

  interface Table<T = any, TKey = any> {
    add(item: T, key?: TKey): Promise<TKey>;
    bulkAdd(items: T[], keys?: TKey[]): Promise<TKey>;
    bulkDelete(keys: TKey[]): Promise<void>;
    bulkGet(keys: TKey[]): Promise<(T | undefined)[]>;
    bulkPut(items: T[], keys?: TKey[]): Promise<TKey>;
    clear(): Promise<void>;
    count(): Promise<number>;
    delete(key: TKey): Promise<void>;
    each(callback: (item: T) => any): Promise<void>;
    filter(fn: (item: T) => boolean): any;
    get(key: TKey | any): Promise<T | undefined>;
    limit(n: number): any;
    orderBy(index: string): any;
    put(item: T, key?: TKey): Promise<TKey>;
    reverse(): any;
    toArray(): Promise<T[]>;
    toCollection(): any;
    update(key: TKey, changes: Partial<T>): Promise<number>;
    where(indexOrPrimaryKey: string | string[]): any;
    [key: string]: any;
  }

  export { Table };
  export default Dexie;
}
