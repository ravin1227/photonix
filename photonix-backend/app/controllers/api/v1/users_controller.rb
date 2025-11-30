module Api
  module V1
    class UsersController < Api::BaseController
      include Authenticatable

      # GET /api/v1/users/search?q=query
      # Search for users by name or email
      def search
        query = params[:q]&.strip&.downcase

        unless query.present?
          render json: { users: [] }
          return
        end

        # Search users by name or email (excluding current user)
        users = User.where.not(id: current_user.id)
                   .where(
                     "LOWER(name) LIKE ? OR LOWER(email) LIKE ?",
                     "%#{query}%",
                     "%#{query}%"
                   )
                   .limit(10)
                   .order(:name)

        render json: {
          users: users.map do |user|
            {
              id: user.id,
              name: user.name,
              email: user.email
            }
          end
        }
      end
    end
  end
end

