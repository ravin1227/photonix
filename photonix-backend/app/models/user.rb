class User < ApplicationRecord
  has_secure_password

  # Associations
  has_many :photos, dependent: :destroy
  has_many :albums, dependent: :destroy
  has_many :created_albums, class_name: 'Album', foreign_key: 'created_by_id', dependent: :destroy
  has_many :album_users, dependent: :destroy
  has_many :shared_albums, through: :album_users, source: :album
  has_many :login_tokens, dependent: :destroy
  has_many :device_album_uploads, dependent: :destroy
  has_many :album_auto_syncs, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :password, length: { minimum: 6 }, if: -> { new_record? || !password.nil? }
  validates :role, presence: true, inclusion: { in: %w[admin user] }

  # Callbacks
  before_create :set_default_storage_quota

  # Scopes
  scope :admins, -> { where(role: 'admin') }
  scope :regular_users, -> { where(role: 'user') }

  # Role methods
  def admin?
    role == 'admin'
  end

  def regular_user?
    role == 'user'
  end

  # Get all photos accessible by this user (from their albums + shared albums)
  def accessible_photos
    if admin?
      Photo.where(deleted_at: nil)
    else
      # User's own photos + photos in shared albums they have access to
      accessible_album_ids = Album.accessible_by(self).pluck(:id)
      Photo.left_joins(:photo_albums)
           .where('photos.user_id = ? OR photo_albums.album_id IN (?)', id, accessible_album_ids)
           .where(deleted_at: nil)
           .distinct
    end
  end

  # Get all albums accessible by this user
  def accessible_albums
    if admin?
      Album.all
    else
      Album.accessible_by(self)
    end
  end

  private

  def set_default_storage_quota
    self.storage_quota ||= 107_374_182_400 # 100GB in bytes
  end
end
