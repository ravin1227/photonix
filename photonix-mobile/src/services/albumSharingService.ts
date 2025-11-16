import apiService from './api';

export interface AlbumShare {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  can_view: boolean;
  can_contribute: boolean;
  is_owner: boolean;
  shared_at: string;
}

export interface AlbumSharesResponse {
  shares: AlbumShare[];
  owner: {
    id: number;
    name: string;
    email: string;
  };
}

class AlbumSharingService {
  // Get list of users album is shared with
  async getAlbumShares(albumId: number) {
    return apiService.get<AlbumSharesResponse>(`/albums/${albumId}/shares`);
  }

  // Share album with a user by email
  async shareAlbum(albumId: number, email: string, canContribute: boolean = false) {
    return apiService.post<{message: string; share: AlbumShare}>(
      `/albums/${albumId}/shares`,
      {
        email,
        can_contribute: canContribute,
      }
    );
  }

  // Unshare album (remove user access)
  async unshareAlbum(albumId: number, shareId: number) {
    return apiService.delete<{message: string}>(`/albums/${albumId}/shares/${shareId}`);
  }

  // Update share permissions
  async updateSharePermissions(
    albumId: number,
    email: string,
    canContribute: boolean
  ) {
    return apiService.post<{message: string; share: AlbumShare}>(
      `/albums/${albumId}/shares`,
      {
        email,
        can_contribute: canContribute,
      }
    );
  }
}

export default new AlbumSharingService();
