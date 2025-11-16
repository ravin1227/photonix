module Api
  module V1
    module Admin
      class UsersController < AdminController
        before_action :set_user, only: [:show, :update, :destroy]

        # GET /api/v1/admin/users
        def index
          users = User.all.order(created_at: :desc)

          render json: {
            users: users.map { |user| user_response(user) }
          }
        end

        # GET /api/v1/admin/users/:id
        def show
          render json: {
            user: user_detail_response(@user)
          }
        end

        # POST /api/v1/admin/users
        def create
          user = User.new(user_params)

          if user.save
            render json: {
              message: 'User created successfully',
              user: user_response(user)
            }, status: :created
          else
            render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PUT /api/v1/admin/users/:id
        def update
          if @user.update(user_update_params)
            render json: {
              message: 'User updated successfully',
              user: user_response(@user)
            }
          else
            render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/users/:id
        def destroy
          if @user.id == current_user.id
            render json: { error: 'Cannot delete your own account' }, status: :unprocessable_entity
            return
          end

          @user.destroy
          render json: { message: 'User deleted successfully' }
        end

        private

        def set_user
          @user = User.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'User not found' }, status: :not_found
        end

        def user_params
          params.require(:user).permit(:name, :email, :password, :role, :storage_quota)
        end

        def user_update_params
          params.require(:user).permit(:name, :email, :role, :storage_quota).tap do |p|
            p[:password] = params.dig(:user, :password) if params.dig(:user, :password).present?
          end
        end

        def user_response(user)
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            storage_quota: user.storage_quota,
            shared_album_count: user.shared_albums.count,
            photo_count: user.photos.count,
            created_at: user.created_at
          }
        end

        def user_detail_response(user)
          user_response(user).merge(
            shared_albums: user.shared_albums.map { |album| album_summary(album) }
          )
        end

        def album_summary(album)
          {
            id: album.id,
            name: album.name,
            description: album.description,
            is_shared: album.is_shared
          }
        end
      end
    end
  end
end
