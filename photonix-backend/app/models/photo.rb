class Photo < ApplicationRecord
  belongs_to :user

  # Associations
  has_many :photo_albums, dependent: :destroy
  has_many :albums, through: :photo_albums
  has_many :photo_tags, dependent: :destroy
  has_many :tags, through: :photo_tags
  has_many :faces, dependent: :destroy
  has_many :people, through: :faces

  # Validations
  validates :original_filename, presence: true
  validates :file_path, presence: true, uniqueness: { conditions: -> { where(deleted_at: nil) } }
  validates :checksum, presence: true, uniqueness: { conditions: -> { where(deleted_at: nil) } }
  validates :format, presence: true

  # Scopes
  scope :active, -> { where(deleted_at: nil) }
  scope :deleted, -> { where.not(deleted_at: nil) }
  scope :processed, -> { where(processing_status: 'completed') }
  scope :pending_processing, -> { where(processing_status: %w[pending processing]) }

  # Enums
  enum :processing_status, {
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed'
  }, prefix: true

  # Methods
  def soft_delete
    update(deleted_at: Time.current)
  end

  def restore
    update(deleted_at: nil)
  end

  def deleted?
    deleted_at.present?
  end
end
