declare module 'meilisearch' {
  export class Meilisearch {
    constructor(config: { host: string; apiKey?: string });
    getIndex(uid: string): Promise<unknown>;
    createIndex(uid: string, options?: { primaryKey?: string }): Promise<unknown>;
    index(uid: string): {
      addDocuments(docs: Record<string, unknown>[]): Promise<unknown>;
      deleteDocument(id: string): Promise<unknown>;
      search(query: string, options?: { filter?: string }): Promise<unknown>;
    };
  }
}
