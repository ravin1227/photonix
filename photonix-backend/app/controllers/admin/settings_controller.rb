module Admin
  class SettingsController < BaseController
    def index
      @settings = Setting.all_settings
      @grouped_settings = group_settings(@settings)
    end

    def update
      success_count = 0
      errors = []

      params[:settings]&.each do |key, value|
        setting = Setting.set(key, value)
        if setting.persisted?
          success_count += 1
        else
          errors << "#{key}: #{setting.errors.full_messages.join(', ')}"
        end
      end

      if errors.empty?
        redirect_to admin_settings_path, notice: "Settings updated successfully (#{success_count} changes saved)"
      else
        redirect_to admin_settings_path, alert: "Some settings failed to update: #{errors.join('; ')}"
      end
    end

    def reset
      Setting.destroy_all
      Setting.initialize_defaults!
      redirect_to admin_settings_path, notice: 'All settings have been reset to defaults'
    end

    private

    def group_settings(settings)
      {
        'Server Configuration' => {
          'server_url' => settings['server_url'],
          'app_name' => settings['app_name'],
          'admin_email' => settings['admin_email']
        },
        'Upload & Storage' => {
          'max_upload_size_mb' => settings['max_upload_size_mb'],
          'allowed_file_types' => settings['allowed_file_types'],
          'storage_quota_gb' => settings['storage_quota_gb'],
          'thumbnail_sizes' => settings['thumbnail_sizes']
        },
        'Features' => {
          'face_detection_enabled' => settings['face_detection_enabled'],
          'qr_login_enabled' => settings['qr_login_enabled'],
          'qr_token_expiry_minutes' => settings['qr_token_expiry_minutes']
        },
        'UI Settings' => {
          'photos_per_page' => settings['photos_per_page']
        }
      }
    end
  end
end
