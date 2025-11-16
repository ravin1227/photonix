module Admin
  class UsersController < BaseController
    before_action :set_user, only: [:show, :edit, :update, :destroy]

    def index
      @users = User.order(created_at: :desc)
    end

    def show
      @shared_albums = @user.shared_albums
      @photos_count = @user.photos.count
    end

    def new
      @user = User.new
    end

    def create
      @user = User.new(user_params)

      if @user.save
        redirect_to admin_users_path, notice: 'User created successfully'
      else
        render :new, status: :unprocessable_entity
      end
    end

    def edit
    end

    def update
      if @user.update(user_update_params)
        redirect_to admin_user_path(@user), notice: 'User updated successfully'
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      if @user.id == current_user.id
        redirect_to admin_users_path, alert: 'Cannot delete your own account'
        return
      end

      @user.destroy
      redirect_to admin_users_path, notice: 'User deleted successfully'
    end

    private

    def set_user
      @user = User.find(params[:id])
    end

    def user_params
      params.require(:user).permit(:name, :email, :password, :role, :storage_quota)
    end

    def user_update_params
      permitted = params.require(:user).permit(:name, :email, :role, :storage_quota)
      permitted[:password] = params[:user][:password] if params[:user][:password].present?
      permitted
    end
  end
end
