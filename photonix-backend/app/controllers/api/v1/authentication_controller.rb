module Api
  module V1
    class AuthenticationController < Api::BaseController
      # POST /api/v1/auth/signup
      def signup
        user = User.new(signup_params)

        if user.save
          token = JsonWebTokenService.generate_token(user)
          render json: {
            message: 'User created successfully',
            user: user_response(user),
            token: token
          }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: login_params[:email])

        if user&.authenticate(login_params[:password])
          token = JsonWebTokenService.generate_token(user)
          render json: {
            message: 'Login successful',
            user: user_response(user),
            token: token
          }, status: :ok
        else
          render json: { error: 'Invalid email or password' }, status: :unauthorized
        end
      end

      # POST /api/v1/auth/qr_login
      def qr_login
        login_token = LoginToken.find_by(token: params[:token])

        if login_token.nil?
          render json: { error: 'Invalid token' }, status: :unauthorized
          return
        end

        unless login_token.valid_token?
          render json: { error: 'Token has expired or already been used' }, status: :unauthorized
          return
        end

        # Mark token as used
        login_token.mark_as_used!

        # Generate JWT token
        user = login_token.user
        jwt_token = JsonWebTokenService.generate_token(user)

        render json: {
          message: 'Login successful',
          user: user_response_with_clusters(user),
          token: jwt_token
        }, status: :ok
      rescue StandardError => e
        render json: { error: "Login failed: #{e.message}" }, status: :internal_server_error
      end

      private

      def signup_params
        params.require(:user).permit(:email, :password, :password_confirmation, :name)
      end

      def login_params
        params.require(:user).permit(:email, :password)
      end

      def user_response(user)
        {
          id: user.id,
          email: user.email,
          name: user.name,
          storage_quota: user.storage_quota,
          created_at: user.created_at
        }
      end

      def user_response_with_clusters(user)
        user_response(user).merge(
          role: user.role,
          shared_albums: user.shared_albums.map do |album|
            {
              id: album.id,
              name: album.name,
              description: album.description,
              is_shared: album.is_shared
            }
          end
        )
      end
    end
  end
end
