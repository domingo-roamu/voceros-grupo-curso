import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'announcement-media';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20 MB

export function getMediaType(mimeType: string): 'image' | 'video' | 'document' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  return 'document';
}

export function getMaxSize(mimeType: string): number {
  const type = getMediaType(mimeType);
  if (type === 'image') return MAX_IMAGE_SIZE;
  if (type === 'video') return MAX_VIDEO_SIZE;
  return MAX_DOC_SIZE;
}

export function validateFile(file: File): string | null {
  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return `Tipo de archivo no permitido: ${file.type}`;
  }
  const maxSize = getMaxSize(file.type);
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return `El archivo "${file.name}" excede el límite de ${maxMB} MB`;
  }
  return null;
}

export async function uploadAnnouncementFile(
  supabase: SupabaseClient,
  announcementId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? '';
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const path = `${announcementId}/${uniqueName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Error subiendo ${file.name}: ${error.message}`);
  return path;
}

export function getPublicUrl(supabase: SupabaseClient, storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteAnnouncementFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Error eliminando archivo: ${error.message}`);
}

export async function deleteAnnouncementFolder(
  supabase: SupabaseClient,
  announcementId: string
): Promise<void> {
  const { data: files } = await supabase.storage.from(BUCKET).list(announcementId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${announcementId}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}
