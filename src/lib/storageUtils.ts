import { supabase } from "./supabase";
import { compressImageIfNeeded } from "./imageUtils";

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
        // Compress image if needed
        const compressedFile = await compressImageIfNeeded(file);

        // Upload to storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, compressedFile, {
                cacheControl: "3600",
                upsert: true,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
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

    // Profile photo methods
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

    // Supplier image methods
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

    // Utility to extract path from URL
    static extractPathFromUrl(url: string, bucket: string): string | null {
        try {
            const urlParts = url.split(`/storage/v1/object/public/${bucket}/`);
            return urlParts[1] || null;
        } catch {
            return null;
        }
    }

    // Get public URL from path
    static getPublicUrl(bucket: string, path: string): string {
        const {
            data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    }
}
