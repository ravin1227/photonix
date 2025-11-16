module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!
    attr_reader :current_user
  end

  private

  def authenticate_user!
    token = extract_token_from_header
    unless token
      render json: { error: 'No token provided' }, status: :unauthorized
      return
    end

    @current_user = JsonWebTokenService.verify_token(token)
    unless @current_user
      render json: { error: 'Invalid or expired token' }, status: :unauthorized
    end
  end

  def extract_token_from_header
    auth_header = request.headers['Authorization']
    return nil unless auth_header

    # Expected format: "Bearer <token>"
    auth_header.split(' ').last if auth_header.start_with?('Bearer ')
  end

  def current_user?(user)
    current_user == user
  end
end
