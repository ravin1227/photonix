import apiService from './api';

export interface Album {
  id: number;
  name: string;
  description: string | null;
  privacy: string;
  album_type: string;
  photo_count: number;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumDetail extends Album {
  photos_count: number;
}

export interface AlbumPermissions {
  is_owner: boolean;
  can_view: boolean;
  can_add_photos: boolean;
  can_delete_album: boolean;
  can_delete_own_photos: boolean;
  can_delete_others_photos: boolean;  // Updated: explicitly false for everyone
  can_share: boolean;
}

export interface AlbumPhoto {
  id: number;
  original_filename: string;
  thumbnail_url: string;
  captured_at: string | null;
  uploaded_by: {  // NEW: Who uploaded this photo
    id: number;
    name: string;
  };
  is_mine: boolean;  // NEW: Did current user upload this photo
  can_delete: boolean;  // NEW: Can current user delete this photo
}

export interface AlbumsResponse {
  albums: Album[];
}

export interface AlbumPhotosResponse {
  photos: AlbumPhoto[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface CreateAlbumData {
  name: string;
  description?: string;
  privacy?: 'private' | 'shared' | 'public';
  album_type?: 'manual' | 'smart' | 'date_based';
}

export interface CreateAlbumResponse {
  message: string;
  album: Album;
}

class AlbumService {
  // Get all albums
  async getAlbums() {
    return apiService.get<AlbumsResponse>('/albums');
  }

  // Get album details
  async getAlbum(id: number) {
    return apiService.get<{
      album: AlbumDetail;
      photos: AlbumPhoto[];
      permissions: AlbumPermissions;
    }>(`/albums/${id}`);
  }

  // Create album
  async createAlbum(data: CreateAlbumData) {
    return apiService.post<CreateAlbumResponse>('/albums', {
      album: data,
    });
  }

  // Update album
  async updateAlbum(id: number, data: Partial<CreateAlbumData>) {
    return apiService.patch<CreateAlbumResponse>(`/albums/${id}`, {
      album: data,
    });
  }

  // Delete album
  async deleteAlbum(id: number) {
    return apiService.delete<{message: string}>(`/albums/${id}`);
  }

  // Get photos in album
  async getAlbumPhotos(id: number, page: number = 1, perPage: number = 50) {
    return apiService.get<AlbumPhotosResponse>(
      `/albums/${id}/photos?page=${page}&per_page=${perPage}`,
    );
  }

  // Add photo to album
  async addPhotoToAlbum(albumId: number, photoId: number) {
    return apiService.post<{message: string}>(
      `/albums/${albumId}/photos`,
      {photo_id: photoId},
    );
  }

  // Remove photo from album
  async removePhotoFromAlbum(albumId: number, photoId: number) {
    return apiService.delete<{message: string}>(
      `/albums/${albumId}/photos/${photoId}`,
    );
  }
}

export default new AlbumService();

