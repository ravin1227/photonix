class Album < ApplicationRecord
  belongs_to :user
  belongs_to :created_by, class_name: 'User', foreign_key: 'created_by_id', optional: true
  belongs_to :cover_photo, class_name: 'Photo', optional: true

  # Associations
  has_many :photo_albums, dependent: :destroy
  has_many :photos, through: :photo_albums
  has_many :album_users, dependent: :destroy
  has_many :shared_with_users, through: :album_users, source: :user

  # Validations
  validates :name, presence: true
  validates :privacy, inclusion: { in: %w[private shared public] }, allow_nil: true
  validates :album_type, inclusion: { in: %w[manual smart date_based] }, allow_nil: true

  # Callbacks
  before_create :set_created_by

  # Enums
  enum :privacy, {
    private: 'private',
    shared: 'shared',
    public: 'public'
  }, prefix: true

  enum :album_type, {
    manual: 'manual',
    smart: 'smart',
    date_based: 'date_based'
  }, prefix: true

  # Scopes
  scope :by_user, ->(user) { where(user: user) }
  scope :accessible_by, ->(user) do
    left_joins(:album_users)
      .where('albums.user_id = ? OR albums.created_by_id = ? OR album_users.user_id = ?', user.id, user.id, user.id)
      .or(where(is_shared: true))
      .distinct
  end
  scope :shared_albums, -> { where(is_shared: true) }
  scope :private_albums, -> { where(is_shared: false) }

  # Instance methods
  def owner
    created_by || user
  end

  def share_with(user, can_contribute: false)
    album_users.find_or_create_by!(user: user) do |album_user|
      album_user.can_view = true
      album_user.can_contribute = can_contribute
      album_user.is_owner = false
    end
    update(is_shared: true)
  end

  def unshare_with(user)
    album_users.where(user: user).destroy_all
    update(is_shared: false) if album_users.count.zero?
  end

  def user_can_view?(user)
    return true if owner == user
    return true if user.admin?
    album_users.exists?(user: user, can_view: true)
  end

  def user_can_contribute?(user)
    return true if owner == user
    return true if user.admin?
    album_users.exists?(user: user, can_contribute: true)
  end

  private

  def set_created_by
    self.created_by_id ||= user_id
  end
end
