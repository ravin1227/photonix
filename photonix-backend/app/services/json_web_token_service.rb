class JsonWebTokenService
  SECRET_KEY = ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
  ALGORITHM = 'HS256'
  EXPIRATION_TIME = 24.hours

  class << self
    # Encode a payload into a JWT token
    # @param payload [Hash] The payload to encode
    # @param exp [Time] Optional expiration time
    # @return [String] JWT token
    def encode(payload, exp = EXPIRATION_TIME.from_now)
      payload[:exp] = exp.to_i
      JWT.encode(payload, SECRET_KEY, ALGORITHM)
    end

    # Decode a JWT token
    # @param token [String] The JWT token
    # @return [Hash, nil] Decoded payload or nil if invalid
    def decode(token)
      body = JWT.decode(token, SECRET_KEY, true, { algorithm: ALGORITHM })[0]
      HashWithIndifferentAccess.new(body)
    rescue JWT::DecodeError, JWT::ExpiredSignature => e
      Rails.logger.info "JWT decode error: #{e.message}"
      nil
    end

    # Generate a token for a user
    # @param user [User] The user
    # @return [String] JWT token
    def generate_token(user)
      payload = {
        user_id: user.id,
        email: user.email
      }
      encode(payload)
    end

    # Verify and decode a user token
    # @param token [String] The JWT token
    # @return [User, nil] The user or nil if invalid
    def verify_token(token)
      decoded = decode(token)
      return nil unless decoded

      User.find_by(id: decoded[:user_id])
    rescue ActiveRecord::RecordNotFound
      nil
    end
  end
end
