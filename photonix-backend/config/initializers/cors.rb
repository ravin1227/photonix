# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # In development, allow all origins (mobile apps, localhost, network IPs)
    # In production, specify allowed origins via ALLOWED_ORIGINS env variable
    if Rails.env.development?
      origins '*'

      resource "*",
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        credentials: false,  # Cannot use credentials with wildcard origins
        expose: ['Authorization']
    else
      origins ENV.fetch("ALLOWED_ORIGINS", "").split(",")

      resource "*",
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        credentials: true,
        expose: ['Authorization']
    end
  end
end
