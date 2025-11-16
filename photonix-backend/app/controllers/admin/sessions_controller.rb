module Admin
  class SessionsController < ApplicationController
    layout 'admin_login'

    def new
      # Login form
      redirect_to admin_dashboard_path if session[:user_id].present?
    end

    def create
      user = User.find_by(email: params[:email])

      if user&.authenticate(params[:password]) && user.admin?
        session[:user_id] = user.id
        redirect_to admin_dashboard_path, notice: 'Logged in successfully'
      else
        flash.now[:alert] = 'Invalid email or password, or not an admin'
        render :new, status: :unprocessable_entity
      end
    end

    def new_signup
      # Only allow signup if no admin users exist
      if User.where(role: 'admin').exists?
        redirect_to admin_login_path, alert: 'Admin user already exists. Please login.'
        return
      end
    end

    def create_signup
      # Only allow signup if no admin users exist
      if User.where(role: 'admin').exists?
        redirect_to admin_login_path, alert: 'Admin user already exists. Please login.'
        return
      end

      @user = User.new(signup_params)
      @user.role = 'admin'

      if @user.save
        session[:user_id] = @user.id
        redirect_to admin_dashboard_path, notice: 'Admin account created successfully! Welcome to Photonix.'
      else
        flash.now[:alert] = @user.errors.full_messages.join(', ')
        render :new_signup, status: :unprocessable_entity
      end
    end

    def destroy
      session[:user_id] = nil
      redirect_to admin_login_path, notice: 'Logged out successfully'
    end

    private

    def signup_params
      params.require(:user).permit(:name, :email, :password, :password_confirmation)
    end
  end
end
