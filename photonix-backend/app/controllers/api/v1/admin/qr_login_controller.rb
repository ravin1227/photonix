module Api
  module V1
    module Admin
      class QrLoginController < AdminController
        # POST /api/v1/admin/qr_login/generate
        def generate
          user = User.find(params[:user_id])

          # Clean up old expired tokens for this user
          user.login_tokens.expired.destroy_all

          # Create new login token
          login_token = user.login_tokens.create!

          base_url = params[:base_url] || "#{request.protocol}#{request.host_with_port}"

          render json: {
            message: 'QR login token generated successfully',
            token: login_token.token,
            qr_data: login_token.to_qr_data(base_url),
            expires_at: login_token.expires_at,
            user: {
              id: user.id,
              name: user.name,
              email: user.email
            }
          }, status: :created
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'User not found' }, status: :not_found
        rescue StandardError => e
          render json: { error: "Failed to generate token: #{e.message}" }, status: :internal_server_error
        end

        # GET /api/v1/admin/qr_login/tokens
        def tokens
          user = User.find(params[:user_id])
          tokens = user.login_tokens.active.order(created_at: :desc)

          render json: {
            tokens: tokens.map { |token| token_response(token) }
          }
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'User not found' }, status: :not_found
        end

        private

        def token_response(token)
          {
            id: token.id,
            token: token.token,
            used: token.used,
            expires_at: token.expires_at,
            created_at: token.created_at
          }
        end
      end
    end
  end
end
