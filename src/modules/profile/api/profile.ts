import { supabase } from '@/utils/supabase';
import { decode } from 'base64-arraybuffer';
import type { ImagePickerAsset } from 'expo-image-picker';


export type Profile = {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    updatedAt: string | null;
};

type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    updated_at: string | null;
};

function mapProfileRowToProfile(row: ProfileRow): Profile {
    return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url, updatedAt: row.updated_at };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProfileRowToProfile(data) : null;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName.trim(), updated_at: new Date().toISOString() });

    if (error) throw error;
}

export async function uploadAvatar( userId: string, asset: ImagePickerAsset): Promise<string> {
    if (!asset.base64) {
        throw new Error('La imagen seleccionada no incluye datos base64.');
    }

    const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar.${extension}`;
    const contentType = asset.mimeType ?? `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(asset.base64), { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: userId, avatar_url: data.publicUrl, updated_at: new Date().toISOString() });

    if (updateError) throw updateError;

    return data.publicUrl;
}

