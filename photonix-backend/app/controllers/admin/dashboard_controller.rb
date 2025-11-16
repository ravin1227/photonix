module Admin
  class DashboardController < BaseController
    def index
      # Fetch stats from API controller
      @stats = {
        total_users: User.count,
        total_admins: User.admins.count,
        total_regular_users: User.regular_users.count,
        total_photos: Photo.active.count,
        total_people: Person.count,
        total_faces: Face.count,
        total_albums: Album.count,
        total_shared_albums: Album.shared_albums.count,
        storage_used: Photo.active.sum(:file_size) || 0,
        face_detection_healthy: check_face_detection_health
      }

      @recent_photos = Photo.active.includes(:user).order(created_at: :desc).limit(5)
      @recent_users = User.order(created_at: :desc).limit(5)
      @recent_people = Person.order(created_at: :desc).limit(5)
      @recent_albums = Album.shared_albums.order(created_at: :desc).limit(5)
    end

    private

    def check_face_detection_health
      FaceDetectionService.healthy?
    rescue StandardError
      false
    end
  end
end
