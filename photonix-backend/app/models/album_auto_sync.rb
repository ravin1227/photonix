class AlbumAutoSync < ApplicationRecord
  belongs_to :user
  belongs_to :device_album_upload, optional: true
  belongs_to :server_album, class_name: 'Album'

  # Define enum BEFORE validations that reference it
  enum :sync_frequency, { manual: 'manual', hourly: 'hourly', daily: 'daily' }

  validates :user_id, presence: true
  validates :server_album_id, presence: true
  validates :sync_frequency, presence: true, inclusion: { in: %w(manual hourly daily) }
  validates :enabled, inclusion: { in: [true, false] }

  scope :by_user, ->(user) { where(user_id: user.id) }
  scope :active, -> { where(enabled: true) }
  scope :pending_sync, -> { active.where('new_photos_since_sync > 0') }

  validate :uniqueness_of_sync_config

  before_save :ensure_user_id

  def update_sync_status(new_photo_count)
    diff = new_photo_count - last_photo_count
    if diff > 0
      self.new_photos_since_sync = diff
    end
    save
  end

  def record_sync(synced_count)
    self.update(
      last_sync_at: Time.current,
      last_photo_count: last_photo_count + synced_count,
      new_photos_since_sync: 0
    )
  end

  def sync_needed?
    enabled? && new_photos_since_sync > 0
  end

  def time_since_last_sync
    return nil unless last_sync_at.present?
    (Time.current - last_sync_at).round
  end

  def to_response
    {
      id: id,
      device_album_upload_id: device_album_upload_id,
      server_album_id: server_album_id,
      enabled: enabled,
      sync_frequency: sync_frequency,
      last_sync_at: last_sync_at,
      last_photo_count: last_photo_count,
      new_photos_since_sync: new_photos_since_sync,
      sync_needed: sync_needed?,
      time_since_last_sync: time_since_last_sync,
      created_at: created_at,
      updated_at: updated_at
    }
  end

  private

  def uniqueness_of_sync_config
    if device_album_upload_id.present?
      existing = AlbumAutoSync.where(
        user_id: user_id,
        device_album_upload_id: device_album_upload_id,
        server_album_id: server_album_id
      ).where.not(id: id).first

      if existing.present?
        errors.add(:base, 'Sync configuration already exists for this device album and server album')
      end
    end
  end

  def ensure_user_id
    self.user_id ||= device_album_upload&.user_id if device_album_upload_id.present?
  end
end
