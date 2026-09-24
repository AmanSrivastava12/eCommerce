import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// meilisearch ships ESM-only; loaded via dynamic import at runtime (works fine under
// Nest's CommonJS build) instead of a static import, which TS can't resolve for a
// CommonJS consumer.
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: any;
  private readonly indexName = 'products';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Never let a missing/unreachable Meilisearch instance block app startup — search
    // degrades to empty results (see `search()` below) rather than taking the API down.
    try {
      const { Meilisearch } = await import('meilisearch');
      this.client = new Meilisearch({
        host: this.configService.get<string>('MEILISEARCH_HOST') ?? 'http://localhost:7700',
        apiKey: this.configService.get<string>('MEILISEARCH_API_KEY'),
      });
      try {
        await this.client.getIndex(this.indexName);
      } catch {
        await this.client.createIndex(this.indexName, { primaryKey: 'id' });
      }
    } catch (err) {
      this.logger.warn(`Meilisearch unavailable at startup, search will return empty results: ${(err as Error).message}`);
      this.client = null;
    }
  }

  async indexProduct(doc: Record<string, unknown>) {
    if (!this.client) return;
    try {
      await this.client.index(this.indexName).addDocuments([doc]);
    } catch (err) {
      this.logger.warn(`Failed to index product ${doc.id}: ${(err as Error).message}`);
    }
  }

  async removeProduct(id: string) {
    if (!this.client) return;
    try {
      await this.client.index(this.indexName).deleteDocument(id);
    } catch (err) {
      this.logger.warn(`Failed to remove product ${id} from index: ${(err as Error).message}`);
    }
  }

  async search(query: string, filters?: string) {
    if (!this.client) return { hits: [] };
    try {
      return await this.client.index(this.indexName).search(query, { filter: filters });
    } catch (err) {
      this.logger.warn(`Search failed, falling back to empty result: ${(err as Error).message}`);
      return { hits: [] };
    }
  }
}
