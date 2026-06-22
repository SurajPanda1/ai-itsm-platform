export interface AttachmentStorage {
  put(key: string, body: NodeJS.ReadableStream, contentType: string): Promise<void>;
  getDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export const ATTACHMENT_STORAGE = Symbol('ATTACHMENT_STORAGE');
