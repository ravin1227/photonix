module Api
  module V1
    class AdminController < Api::BaseController
      include Authenticatable
      include AdminAuthorization
    end
  end
end
