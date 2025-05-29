import { supabase } from "@/lib/supabase";
import { compressImageIfNeeded } from "./image";

export interface UploadResult {
    path: string;
    publicUrl: string;
}

export class StorageService {
    private static async uploadFile(
        bucket: string,
        file: File,
        path: string
    ): Promise<UploadResult> {
        const compressedFile = await compressImageIfNeeded(file);

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, compressedFile, {
                cacheControl: "3600",
                upsert: true,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);

        return {
            path: data.path,
            publicUrl,
        };
    }

    private static async deleteFile(bucket: string, path: string): Promise<void> {
        const { error } = await supabase.storage.from(bucket).remove([path]);

        if (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    static async uploadProfilePhoto(
        userId: string,
        file: File
    ): Promise<UploadResult> {
        const timestamp = Date.now();
        const extension = file.name.split(".").pop() || "jpg";
        const path = `${userId}/profile_${timestamp}.${extension}`;

        return this.uploadFile("profiles", file, path);
    }

    static async deleteProfilePhoto(path: string): Promise<void> {
        return this.deleteFile("profiles", path);
    }

    static async uploadSupplierImage(
        supplierId: string,
        file: File
    ): Promise<UploadResult> {
        const timestamp = Date.now();
        const extension = file.name.split(".").pop() || "jpg";
        const path = `${supplierId}/image_${timestamp}.${extension}`;

        return this.uploadFile("suppliers", file, path);
    }

    static async deleteSupplierImage(path: string): Promise<void> {
        return this.deleteFile("suppliers", path);
    }

    static extractPathFromUrl(url: string, bucket: string): string | null {
        try {
            const urlParts = url.split(`/storage/v1/object/public/${bucket}/`);
            return urlParts[1] || null;
        } catch {
            return null;
        }
    }

    static getPublicUrl(bucket: string, path: string): string {
        const {
            data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    }
}
