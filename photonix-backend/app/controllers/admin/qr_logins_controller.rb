module Admin
  class QrLoginsController < BaseController
    def index
      @users = User.regular_users.order(:name)
    end

    def create
      @user = User.find(params[:user_id])

      # Clean up old expired tokens
      @user.login_tokens.expired.destroy_all

      # Create new login token
      @login_token = @user.login_tokens.create!

      # Use configured server URL from settings
      @base_url = Setting.server_url
      @qr_data = @login_token.to_qr_data(@base_url)

      respond_to do |format|
        format.html { render :show }
        format.turbo_stream
      end
    rescue ActiveRecord::RecordNotFound
      redirect_to admin_qr_logins_path, alert: 'User not found'
    end
  end
end
