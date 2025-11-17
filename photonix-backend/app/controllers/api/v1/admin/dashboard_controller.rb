module Api
  module V1
    module Admin
      class DashboardController < AdminController
        # GET /api/v1/admin/dashboard/stats
        def stats
          render json: {
            stats: {
              total_users: User.count,
              total_admins: User.admins.count,
              total_regular_users: User.regular_users.count,
              total_photos: Photo.active.count,
              total_people: Person.count,
              total_faces: Face.count,
              total_albums: Album.count,
              total_shared_albums: Album.shared_albums.count,
              total_tags: Tag.count,
              storage_used: calculate_storage_used,
              recent_uploads: Photo.active.order(created_at: :desc).limit(10).count,
              face_detection_service_healthy: check_face_detection_health
            },
            recent_activity: {
              recent_photos: recent_photos,
              recent_users: recent_users,
              recent_people: recent_people,
              recent_shared_albums: recent_shared_albums
            }
          }
        end

        private

        def calculate_storage_used
          Photo.active.sum(:file_size) || 0
        end

        def check_face_detection_health
          FaceDetectionService.healthy?
        rescue StandardError
          false
        end

        def recent_photos
          Photo.active
               .order(created_at: :desc)
               .limit(5)
               .map do |photo|
            {
              id: photo.id,
              original_filename: photo.original_filename,
              file_size: photo.file_size,
              user: {
                id: photo.user.id,
                name: photo.user.name
              },
              created_at: photo.created_at
            }
          end
        end

        def recent_users
          User.order(created_at: :desc)
              .limit(5)
              .map do |user|
            {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              created_at: user.created_at
            }
          end
        end

        def recent_people
          Person.includes(:faces)
                .order(created_at: :desc)
                .limit(5)
                .map do |person|
            {
              id: person.id,
              name: person.name || "Person ##{person.id}",
              face_count: person.face_count,
              created_at: person.created_at
            }
          end
        end

        def recent_shared_albums
          Album.shared_albums
               .order(created_at: :desc)
               .limit(5)
               .map do |album|
            {
              id: album.id,
              name: album.name,
              photo_count: album.photos.active.count,
              shared_with_count: album.album_users.count,
              created_at: album.created_at
            }
          end
        end
      end
    end
  end
end
