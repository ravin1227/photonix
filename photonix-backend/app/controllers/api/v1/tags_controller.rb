module Api
  module V1
    class TagsController < Api::BaseController
      include Authenticatable

      # GET /api/v1/tags
      def index
        tags = Tag.all.order(usage_count: :desc)
        render json: { tags: tags.map { |tag| tag_response(tag) } }
      end

      # GET /api/v1/tags/:id
      def show
        tag = Tag.find(params[:id])
        photos = tag.photos.where(user: current_user).active

        render json: {
          tag: tag_response(tag),
          photos: photos.map { |photo| photo_summary(photo) }
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Tag not found' }, status: :not_found
      end

      # POST /api/v1/tags
      def create
        tag = Tag.find_or_create_by(name: tag_params[:name], tag_type: 'user')

        if tag.persisted?
          render json: {
            message: 'Tag created successfully',
            tag: tag_response(tag)
          }, status: :created
        else
          render json: { errors: tag.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/photos/:photo_id/tags
      def add_to_photo
        photo = current_user.photos.find(params[:photo_id])
        tag = Tag.find_or_create_by(name: params[:tag_name], tag_type: 'user')

        photo_tag = photo.photo_tags.find_or_create_by(tag: tag, source: 'user')

        if photo_tag.persisted?
          render json: { message: 'Tag added to photo', tag: tag_response(tag) }
        else
          render json: { errors: photo_tag.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Photo not found' }, status: :not_found
      end

      # DELETE /api/v1/photos/:photo_id/tags/:id
      def remove_from_photo
        photo = current_user.photos.find(params[:photo_id])
        photo_tag = photo.photo_tags.find_by(tag_id: params[:id])

        if photo_tag
          photo_tag.destroy
          render json: { message: 'Tag removed from photo' }
        else
          render json: { error: 'Tag not associated with photo' }, status: :not_found
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Photo not found' }, status: :not_found
      end

      private

      def tag_params
        params.require(:tag).permit(:name, :category)
      end

      def tag_response(tag)
        {
          id: tag.id,
          name: tag.name,
          tag_type: tag.tag_type,
          category: tag.category,
          usage_count: tag.usage_count
        }
      end

      def photo_summary(photo)
        {
          id: photo.id,
          original_filename: photo.original_filename,
          thumbnail_url: "/api/v1/photos/#{photo.id}/thumbnail/small"
        }
      end
    end
  end
end
