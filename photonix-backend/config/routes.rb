Rails.application.routes.draw do
  # Health check endpoint
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # Health check
      get 'health', to: 'health#show'

      # Authentication
      post 'auth/signup', to: 'authentication#signup'
      post 'auth/login', to: 'authentication#login'
      post 'auth/qr_login', to: 'authentication#qr_login'

      # Users
      get 'users/search', to: 'users#search'

      # Photos
      resources :photos, only: [:index, :show, :create, :destroy] do
        collection do
          post 'check_bulk_upload', to: 'photos#check_bulk_upload'
        end
        member do
          get 'download'
          get 'thumbnail/:size', to: 'photos#thumbnail', as: 'thumbnail'
        end

        # Tags on photos
        post 'tags', to: 'tags#add_to_photo'
        delete 'tags/:id', to: 'tags#remove_from_photo'
      end

      # Albums
      resources :albums do
        member do
          get 'photos', to: 'albums#list_photos'
          post 'photos', to: 'albums#add_photo'
          delete 'photos/:photo_id', to: 'albums#remove_photo'
          post 'share'
          delete 'unshare'
          get 'shared_users'
        end

        # Album sharing
        resources :shares, controller: 'album_shares', only: [:index, :create, :destroy]
      end

      # Device Albums
      resources :device_albums, only: [:show] do
        collection do
          post 'track'
          get 'uploads'
        end
        member do
          post 'sync/enable', to: 'device_albums#enable_sync'
          post 'sync/disable', to: 'device_albums#disable_sync'
          get 'sync/status', to: 'device_albums#sync_status'
        end
      end

      # Tags
      resources :tags, only: [:index, :show, :create]

      # People (Face Grouping)
      resources :people do
        member do
          post 'merge'
          get 'faces'
        end
      end

      # Faces
      resources :faces, only: [] do
        member do
          get 'thumbnail'
        end
      end

      # Admin routes
      namespace :admin do
        # Dashboard & Stats
        get 'dashboard/stats', to: 'dashboard#stats'

        # User Management
        resources :users, only: [:index, :show, :create, :update, :destroy]

        # QR Login
        post 'qr_login/generate', to: 'qr_login#generate'
        get 'qr_login/tokens', to: 'qr_login#tokens'
      end
    end
  end

  # Admin Web UI
  namespace :admin do
    get 'login', to: 'sessions#new'
    post 'login', to: 'sessions#create'
    delete 'logout', to: 'sessions#destroy'

    get 'signup', to: 'sessions#new_signup'
    post 'signup', to: 'sessions#create_signup'

    get 'dashboard', to: 'dashboard#index'

    resources :users
    resources :qr_logins, only: [:index, :create]

    get 'settings', to: 'settings#index'
    patch 'settings', to: 'settings#update'
    post 'settings/reset', to: 'settings#reset'
  end

  # Root path
  root to: 'admin/sessions#new'
end
