module Api
  module V1
    class DeviceAlbumsController < Api::BaseController
      include Authenticatable

      before_action :set_device_album_upload, only: [:show, :enable_sync, :disable_sync, :sync_status]

      # POST /api/v1/device-albums/track
      def track
        device_album_params = params.require(:device_album).permit(:device_album_id, :device_album_name, :device_type, :total_device_count, :server_album_id)

        # Validate server album exists and user has access
        server_album = current_user.accessible_albums.find(device_album_params[:server_album_id]) if device_album_params[:server_album_id].present?

        # Find or create device album upload
        device_album = DeviceAlbumUpload.find_or_create_by(
          user_id: current_user.id,
          device_album_id: device_album_params[:device_album_id],
          device_type: device_album_params[:device_type]
        ) do |upload|
          upload.device_album_name = device_album_params[:device_album_name]
          upload.total_device_count = device_album_params[:total_device_count]
          upload.server_album_id = server_album&.id
        end

        # Update if it already existed
        if device_album.persisted? && device_album_params[:server_album_id].present?
          device_album.update(server_album_id: server_album.id)
        end

        if device_album.save
          render json: {
            message: 'Device album tracked successfully',
            device_album: device_album.to_response
          }, status: :created
        else
          render json: { errors: device_album.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Server album not found or access denied' }, status: :not_found
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/device-albums/uploads
      def uploads
        device_type_filter = params[:device_type]
        page = params[:page] || 1
        per_page = params[:per_page] || 50

        uploads = current_user.device_album_uploads.order(created_at: :desc)
        uploads = uploads.by_device(device_type_filter) if device_type_filter.present?

        paginated = uploads.page(page).per(per_page)

        render json: {
          device_albums: paginated.map { |upload| device_album_with_syncs(upload) },
          meta: {
            current_page: paginated.current_page,
            total_pages: paginated.total_pages,
            total_count: paginated.total_count,
            per_page: paginated.limit_value
          }
        }
      end

      # GET /api/v1/device-albums/:id
      def show
        render json: {
          device_album: device_album_with_syncs(@device_album)
        }
      end

      # POST /api/v1/device-albums/:id/sync/enable
      def enable_sync
        sync_params = params.require(:auto_sync).permit(:server_album_id, :sync_frequency)

        # Validate server album exists and user has access
        server_album = current_user.accessible_albums.find(sync_params[:server_album_id])

        # Find or create the auto sync
        auto_sync = AlbumAutoSync.find_or_create_by(
          user_id: current_user.id,
          device_album_upload_id: @device_album.id,
          server_album_id: server_album.id
        ) do |sync|
          sync.sync_frequency = sync_params[:sync_frequency] || 'manual'
          sync.enabled = true
        end

        # Update if it already existed
        if auto_sync.persisted?
          auto_sync.update(
            enabled: true,
            sync_frequency: sync_params[:sync_frequency] || 'manual'
          )
        end

        if auto_sync.save
          render json: {
            message: 'Auto-sync enabled successfully',
            auto_sync: auto_sync.to_response
          }, status: :created
        else
          render json: { errors: auto_sync.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Server album not found or access denied' }, status: :not_found
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.message }, status: :unprocessable_entity
      end

      # POST /api/v1/device-albums/:id/sync/disable
      def disable_sync
        sync_params = params.require(:auto_sync).permit(:server_album_id)

        auto_sync = @device_album.album_auto_syncs.find_by(server_album_id: sync_params[:server_album_id])

        unless auto_sync
          render json: { error: 'Sync configuration not found' }, status: :not_found
          return
        end

        if auto_sync.update(enabled: false)
          render json: {
            message: 'Auto-sync disabled successfully',
            auto_sync: auto_sync.to_response
          }
        else
          render json: { errors: auto_sync.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/device-albums/:id/sync/status
      def sync_status
        syncs = @device_album.album_auto_syncs.map { |sync| sync.to_response }

        render json: {
          device_album: @device_album.to_response,
          syncs: syncs,
          health: {
            total_syncs: syncs.length,
            active_syncs: syncs.count { |s| s[:enabled] },
            pending_syncs: syncs.count { |s| s[:sync_needed] }
          }
        }
      end

      private

      def set_device_album_upload
        @device_album = current_user.device_album_uploads.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Device album not found or access denied' }, status: :not_found
      end

      def device_album_with_syncs(upload)
        upload.to_response.merge(
          syncs: upload.album_auto_syncs.map { |sync| sync.to_response }
        )
      end
    end
  end
end
