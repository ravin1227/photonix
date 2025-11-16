module Api
  module V1
    class FacesController < Api::BaseController
      include Authenticatable

      # GET /api/v1/faces/:id/thumbnail
      def thumbnail
        face = Face.find(params[:id])

        # Verify the user owns the photo containing this face
        unless face.photo.user_id == current_user.id
          render json: { error: 'Unauthorized' }, status: :unauthorized
          return
        end

        if face.thumbnail_path && File.exist?(File.join(PhotoStorageService::STORAGE_ROOT, face.thumbnail_path))
          thumbnail_file = File.join(PhotoStorageService::STORAGE_ROOT, face.thumbnail_path)
          send_file thumbnail_file, type: 'image/jpeg', disposition: 'inline'
        else
          # If no thumbnail, return a placeholder or 404
          render json: { error: 'Thumbnail not found' }, status: :not_found
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Face not found' }, status: :not_found
      end
    end
  end
end
