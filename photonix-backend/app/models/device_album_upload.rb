class DeviceAlbumUpload < ApplicationRecord
  belongs_to :user
  belongs_to :server_album, class_name: 'Album', optional: true
  has_many :album_auto_syncs, dependent: :destroy

  # Define enum BEFORE validations that reference it
  enum :device_type, { ios: 'ios', android: 'android' }

  validates :user_id, presence: true
  validates :device_album_id, presence: true
  validates :device_album_name, presence: true
  validates :device_type, presence: true, inclusion: { in: %w(ios android) }
  validates :uploaded_count, numericality: { greater_than_or_equal_to: 0 }
  validates :total_device_count, numericality: { greater_than_or_equal_to: 0 }
  validates :device_album_id, uniqueness: { scope: [:user_id, :device_type], message: 'should be unique per user and device type' }

  scope :by_user, ->(user) { where(user_id: user.id) }
  scope :by_device, ->(device_type) { where(device_type: device_type) }
  scope :with_server_album, -> { where.not(server_album_id: nil) }

  def sync_progress
    {
      uploaded: uploaded_count,
      total: total_device_count,
      percentage: total_device_count.zero? ? 0 : (uploaded_count.to_f / total_device_count * 100).round(2)
    }
  end

  def fully_synced?
    total_device_count > 0 && uploaded_count >= total_device_count
  end

  def mark_synced(count)
    self.update(uploaded_count: count, last_upload_at: Time.current)
  end

  def device_identifier
    "#{user_id}-#{device_album_id}-#{device_type}"
  end

  def to_response
    {
      id: id,
      device_album_id: device_album_id,
      device_album_name: device_album_name,
      device_type: device_type,
      server_album_id: server_album_id,
      sync_progress: sync_progress,
      fully_synced: fully_synced?,
      last_upload_at: last_upload_at,
      created_at: created_at,
      updated_at: updated_at
    }
  end
end
