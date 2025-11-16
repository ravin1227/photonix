module Api
  module V1
    class AlbumSharesController < Api::BaseController
      include Authenticatable
      before_action :set_album

      # GET /api/v1/albums/:album_id/shares
      # List all users this album is shared with
      def index
        unless @album.user_can_view?(current_user)
          render json: { error: 'Access denied' }, status: :forbidden
          return
        end

        shares = @album.album_users.includes(:user).map do |album_user|
          {
            id: album_user.id,
            user: {
              id: album_user.user.id,
              name: album_user.user.name,
              email: album_user.user.email
            },
            can_view: album_user.can_view,
            can_contribute: album_user.can_contribute,
            is_owner: album_user.is_owner,
            shared_at: album_user.created_at
          }
        end

        render json: {
          shares: shares,
          owner: {
            id: @album.owner.id,
            name: @album.owner.name,
            email: @album.owner.email
          }
        }
      end

      # POST /api/v1/albums/:album_id/shares
      # Share album with a user by email
      def create
        # Check if current user is the owner (either user_id or created_by_id)
        unless @album.user_id == current_user.id || @album.created_by_id == current_user.id
          Rails.logger.error "Share denied: album.user_id=#{@album.user_id}, album.created_by_id=#{@album.created_by_id}, current_user.id=#{current_user.id}"
          render json: { error: 'Only album owner can share' }, status: :forbidden
          return
        end

        email = params[:email]&.strip&.downcase
        can_contribute = params[:can_contribute] == true || params[:can_contribute] == 'true'

        unless email.present?
          render json: { error: 'Email is required' }, status: :unprocessable_entity
          return
        end

        # Find user by email
        user_to_share = User.find_by(email: email)

        unless user_to_share
          render json: { error: "No user found with email: #{email}" }, status: :not_found
          return
        end

        # Don't allow sharing with yourself
        if user_to_share == current_user
          render json: { error: 'Cannot share album with yourself' }, status: :unprocessable_entity
          return
        end

        # Check if already shared
        existing_share = @album.album_users.find_by(user: user_to_share)
        if existing_share
          # Update permissions if already shared
          existing_share.update(can_contribute: can_contribute)
          render json: {
            message: 'Sharing permissions updated',
            share: share_response(existing_share)
          }
          return
        end

        # Share the album
        @album.share_with(user_to_share, can_contribute: can_contribute)
        album_user = @album.album_users.find_by(user: user_to_share)

        render json: {
          message: "Album shared with #{user_to_share.name}",
          share: share_response(album_user)
        }, status: :created
      end

      # DELETE /api/v1/albums/:album_id/shares/:id
      # Unshare album with a user
      def destroy
        # Check if current user is the owner (either user_id or created_by_id)
        unless @album.user_id == current_user.id || @album.created_by_id == current_user.id
          render json: { error: 'Only album owner can unshare' }, status: :forbidden
          return
        end

        album_user = @album.album_users.find_by(id: params[:id])

        unless album_user
          render json: { error: 'Share not found' }, status: :not_found
          return
        end

        # Don't allow removing owner
        if album_user.is_owner
          render json: { error: 'Cannot remove album owner' }, status: :unprocessable_entity
          return
        end

        album_user.destroy
        @album.update(is_shared: false) if @album.album_users.where(is_owner: false).count.zero?

        render json: { message: 'Album unshared successfully' }
      end

      private

      def set_album
        @album = Album.find(params[:album_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Album not found' }, status: :not_found
      end

      def share_response(album_user)
        {
          id: album_user.id,
          user: {
            id: album_user.user.id,
            name: album_user.user.name,
            email: album_user.user.email
          },
          can_view: album_user.can_view,
          can_contribute: album_user.can_contribute,
          is_owner: album_user.is_owner,
          shared_at: album_user.created_at
        }
      end
    end
  end
end
