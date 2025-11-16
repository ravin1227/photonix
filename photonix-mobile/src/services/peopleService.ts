import apiService from './api';
import {API_CONFIG} from '../config/api';

export interface Face {
  id: number;
  photo_id: number;
  bounding_box?: any;
  confidence?: number;
  thumbnail_url?: string;
}

export interface Person {
  id: number;
  name: string | null;
  face_count: number;
  photo_count: number;
  user_confirmed: boolean;
  thumbnail_url: string | null;
  created_at: string;
  faces?: Face[]; // Only included in detail view
}

export interface PeopleResponse {
  people: Person[];
  meta?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface PersonDetailResponse {
  person: Person;
  photos: Array<{
    id: number;
    original_filename: string;
    format: string;
    file_size: number;
    width: number;
    height: number;
    captured_at: string | null;
    processing_status: string;
    thumbnail_urls: {
      small?: string;
      medium?: string;
      large?: string;
    };
    created_at: string;
  }>;
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

class PeopleService {
  // Get all people
  async getPeople() {
    return apiService.get<PeopleResponse>('/people');
  }

  // Get person details with photos
  async getPerson(id: number, page: number = 1, perPage: number = 50) {
    return apiService.get<PersonDetailResponse>(
      `/people/${id}?page=${page}&per_page=${perPage}`,
    );
  }

  // Get face thumbnail URL (helper method)
  getFaceThumbnailUrl(faceId: number): string {
    // BASE_URL already includes /api/v1, so we just need to add the endpoint
    return `${API_CONFIG.BASE_URL}/faces/${faceId}/thumbnail`;
  }

  // Update person name
  async updatePersonName(id: number, name: string) {
    return apiService.patch<{person: Person}>(`/people/${id}`, {
      person: {name},
    });
  }

  // Update person cover face (thumbnail)
  async updateCoverFace(id: number, faceId: number) {
    return apiService.patch<{person: Person}>(`/people/${id}`, {
      person: {cover_face_id: faceId},
    });
  }

  // Get person faces (for selecting thumbnail)
  async getPersonFaces(id: number, page: number = 1, perPage: number = 50) {
    return apiService.get<{
      faces: Face[];
      meta: {
        current_page: number;
        total_pages: number;
        total_count: number;
        per_page: number;
      };
    }>(`/people/${id}/faces?page=${page}&per_page=${perPage}`);
  }
}

export default new PeopleService();

