module Admin
  class BaseController < ApplicationController
    layout 'admin'
    before_action :authenticate_admin!

    private

    def authenticate_admin!
      if session[:user_id].blank?
        redirect_to admin_login_path, alert: 'Please log in to continue'
        return
      end

      @current_user = User.find_by(id: session[:user_id])

      unless @current_user&.admin?
        session[:user_id] = nil
        redirect_to admin_login_path, alert: 'Admin access required'
      end
    end

    def current_user
      @current_user
    end
    helper_method :current_user
  end
end
