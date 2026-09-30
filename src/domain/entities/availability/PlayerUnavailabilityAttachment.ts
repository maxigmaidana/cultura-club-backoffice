export type AttachmentType = 'LINK' | 'FILE';

export interface PlayerUnavailabilityAttachment {
  id: string;
  unavailabilityId: string;
  attachmentType: AttachmentType;
  title: string;
  description: string | null;
  externalUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedBy: string;
  createdAt: string;
}

export interface CreateLinkAttachmentInput {
  unavailabilityId: string;
  title: string;
  url: string;
  description?: string | null;
  uploadedBy: string;
}

export interface UploadFileAttachmentInput {
  unavailabilityId: string;
  clubId: string;
  playerId: string;
  title: string;
  description?: string | null;
  file: File;
  uploadedBy: string;
}

export interface DeleteAttachmentInput {
  attachment: PlayerUnavailabilityAttachment;
}

export interface CreateAttachmentSignedUrlInput {
  storageBucket: string;
  storagePath: string;
  expiresInSeconds?: number;
  downloadFilename?: string;
}
