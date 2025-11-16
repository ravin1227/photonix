class Setting < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  # Default settings for the application
  DEFAULTS = {
    'server_url' => 'http://localhost:3000',
    'app_name' => 'Photonix',
    'admin_email' => 'admin@photonix.com',
    'max_upload_size_mb' => '100',
    'allowed_file_types' => 'jpg,jpeg,png,gif,heic,heif,webp',
    'storage_quota_gb' => '100',
    'face_detection_enabled' => 'true',
    'qr_login_enabled' => 'true',
    'qr_token_expiry_minutes' => '5',
    'thumbnail_sizes' => '150x150,300x300,800x800',
    'photos_per_page' => '50'
  }.freeze

  # Get a setting value
  def self.get(key)
    setting = find_by(key: key)
    setting&.value || DEFAULTS[key]
  end

  # Set a setting value
  def self.set(key, value, description = nil)
    setting = find_or_initialize_by(key: key)
    setting.value = value
    setting.description = description if description
    setting.save
    setting
  end

  # Get all settings as a hash
  def self.all_settings
    settings_hash = DEFAULTS.dup
    Setting.all.each do |setting|
      settings_hash[setting.key] = setting.value
    end
    settings_hash
  end

  # Initialize default settings if they don't exist
  def self.initialize_defaults!
    DEFAULTS.each do |key, value|
      next if exists?(key: key)

      description = case key
      when 'server_url' then 'Base URL of your server (e.g., https://photos.yourdomain.com)'
      when 'app_name' then 'Application name displayed in UI'
      when 'admin_email' then 'Admin contact email'
      when 'max_upload_size_mb' then 'Maximum file upload size in MB'
      when 'allowed_file_types' then 'Comma-separated list of allowed file extensions'
      when 'storage_quota_gb' then 'Default storage quota per user in GB'
      when 'face_detection_enabled' then 'Enable/disable face detection feature'
      when 'qr_login_enabled' then 'Enable/disable QR code login'
      when 'qr_token_expiry_minutes' then 'QR code token expiry time in minutes'
      when 'thumbnail_sizes' then 'Thumbnail sizes to generate (format: WIDTHxHEIGHT,WIDTHxHEIGHT)'
      when 'photos_per_page' then 'Number of photos to display per page'
      else 'Configuration setting'
      end

      create!(key: key, value: value, description: description)
    end
  end

  # Helper methods for common settings
  def self.server_url
    get('server_url')
  end

  def self.app_name
    get('app_name')
  end

  def self.face_detection_enabled?
    get('face_detection_enabled') == 'true'
  end

  def self.qr_login_enabled?
    get('qr_login_enabled') == 'true'
  end

  def self.max_upload_size_bytes
    get('max_upload_size_mb').to_i * 1024 * 1024
  end

  def self.allowed_file_types_array
    get('allowed_file_types').split(',').map(&:strip)
  end
end
