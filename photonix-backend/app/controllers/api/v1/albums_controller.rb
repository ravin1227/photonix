module Api
  module V1
    class AlbumsController < Api::BaseController
      include Authenticatable
      before_action :set_album, only: [:show, :update, :destroy, :list_photos, :add_photo, :remove_photo, :share, :unshare, :shared_users]

      # GET /api/v1/albums
      def index
        # Include user's own albums + shared albums
        albums = current_user.accessible_albums.order(created_at: :desc)
        render json: { albums: albums.map { |album| album_response(album) } }
      end

      # GET /api/v1/albums/:id
      def show
        photos = @album.photos.active.order('photo_albums.position ASC')
        render json: {
          album: album_detail_response(@album),
          photos: photos.map { |photo| photo_summary(photo) },
          permissions: user_permissions(@album)
        }
      end

      # POST /api/v1/albums
      def create
        album = current_user.albums.new(album_params)

        if album.save
          render json: {
            message: 'Album created successfully',
            album: album_response(album)
          }, status: :created
        else
          render json: { errors: album.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/albums/:id
      def update
        if @album.update(album_params)
          render json: {
            message: 'Album updated successfully',
            album: album_response(@album)
          }
        else
          render json: { errors: @album.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/albums/:id
      def destroy
        # Only owner can delete album
        unless @album.user_id == current_user.id || @album.created_by_id == current_user.id
          render json: { error: 'Only album owner can delete the album' }, status: :forbidden
          return
        end

        @album.destroy
        render json: { message: 'Album deleted successfully' }
      end

      # GET /api/v1/albums/:id/photos
      def list_photos
        photos = @album.photos.active.order('photo_albums.position ASC')
                      .page(params[:page])
                      .per(params[:per_page] || 50)

        render json: {
          photos: photos.map { |photo| photo_summary(photo) },
          meta: {
            current_page: photos.current_page,
            total_pages: photos.total_pages,
            total_count: photos.total_count,
            per_page: photos.limit_value
          }
        }
      end

      # POST /api/v1/albums/:id/photos
      def add_photo
        photo = current_user.photos.find(params[:photo_id])

        unless @album.photos.include?(photo)
          position = @album.photo_albums.maximum(:position).to_i + 1
          @album.photo_albums.create(photo: photo, position: position)
          render json: { message: 'Photo added to album' }
        else
          render json: { error: 'Photo already in album' }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Photo not found' }, status: :not_found
      end

      # DELETE /api/v1/albums/:id/photos/:photo_id
      def remove_photo
        photo_album = @album.photo_albums.find_by(photo_id: params[:photo_id])

        unless photo_album
          render json: { error: 'Photo not in album' }, status: :not_found
          return
        end

        photo = photo_album.photo
        is_owner = @album.user_id == current_user.id || @album.created_by_id == current_user.id
        is_photo_owner = photo.user_id == current_user.id

        # Check if user is a contributor (has can_contribute permission)
        album_user = @album.album_users.find_by(user_id: current_user.id)
        is_contributor = album_user&.can_contribute || false

        # Permission check:
        # - Album owner can delete ANY photo
        # - Contributors can only delete THEIR OWN photos
        # - Viewers cannot delete ANY photos
        can_delete = is_owner || (is_contributor && is_photo_owner)

        if can_delete
          photo_album.destroy
          render json: { message: 'Photo removed from album' }
        else
          if is_photo_owner && !is_contributor
            render json: { error: 'You need contributor permission to delete photos' }, status: :forbidden
          else
            render json: { error: 'You can only remove photos you uploaded' }, status: :forbidden
          end
        end
      end

      # POST /api/v1/albums/:id/share
      def share
        user = User.find(params[:user_id])
        can_contribute = params[:can_contribute] == true || params[:can_contribute] == 'true'

        @album.share_with(user, can_contribute: can_contribute)

        render json: {
          message: 'Album shared successfully',
          album: album_response(@album).merge(
            shared_with: @album.album_users.map { |au| user_share_info(au) }
          )
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :not_found
      end

      # DELETE /api/v1/albums/:id/unshare
      def unshare
        user = User.find(params[:user_id])
        @album.unshare_with(user)

        render json: {
          message: 'Album unshared successfully',
          album: album_response(@album)
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :not_found
      end

      # GET /api/v1/albums/:id/shared_users
      def shared_users
        users = @album.album_users.includes(:user).map { |au| user_share_info(au) }

        render json: {
          shared_users: users
        }
      end

      private

      def set_album
        # Allow access to owned albums + shared albums
        @album = current_user.accessible_albums.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Album not found or access denied' }, status: :not_found
      end

      def album_params
        params.require(:album).permit(:name, :description, :privacy, :album_type, :cover_photo_id)
      end

      def album_response(album)
        {
          id: album.id,
          name: album.name,
          description: album.description,
          privacy: album.privacy,
          album_type: album.album_type,
          is_shared: album.is_shared,
          photo_count: album.photos.count,
          shared_with_count: album.album_users.count,
          cover_photo_url: cover_photo_url(album),
          created_at: album.created_at,
          updated_at: album.updated_at
        }
      end

      def user_share_info(album_user)
        {
          id: album_user.user.id,
          name: album_user.user.name,
          email: album_user.user.email,
          can_view: album_user.can_view,
          can_contribute: album_user.can_contribute,
          is_owner: album_user.is_owner,
          added_at: album_user.created_at
        }
      end

      def album_detail_response(album)
        album_response(album).merge(
          photos_count: album.photos.count
        )
      end

      def photo_summary(photo)
        {
          id: photo.id,
          original_filename: photo.original_filename,
          thumbnail_url: "#{request.protocol}#{request.host_with_port}/api/v1/photos/#{photo.id}/thumbnail/small",
          captured_at: photo.captured_at
        }
      end

      def cover_photo_url(album)
        if album.cover_photo
          "#{request.protocol}#{request.host_with_port}/api/v1/photos/#{album.cover_photo.id}/thumbnail/medium"
        elsif album.photos.any?
          "#{request.protocol}#{request.host_with_port}/api/v1/photos/#{album.photos.first.id}/thumbnail/medium"
        end
      end

      def user_permissions(album)
        is_owner = album.user_id == current_user.id || album.created_by_id == current_user.id
        album_user = album.album_users.find_by(user_id: current_user.id)

        {
          is_owner: is_owner,
          can_view: is_owner || album_user&.can_view || false,
          can_add_photos: is_owner || album_user&.can_contribute || false,
          can_delete_album: is_owner,
          can_delete_own_photos: is_owner || album_user&.can_contribute || false,
          can_delete_any_photos: is_owner,
          can_share: is_owner
        }
      end
    end
  end
end
