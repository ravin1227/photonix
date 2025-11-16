class AlbumUser < ApplicationRecord
  belongs_to :album
  belongs_to :user

  validates :user_id, uniqueness: { scope: :album_id }
  validates :can_view, inclusion: { in: [true, false] }
  validates :can_contribute, inclusion: { in: [true, false] }

  # Scopes
  scope :owners, -> { where(is_owner: true) }
  scope :contributors, -> { where(can_contribute: true) }
  scope :viewers, -> { where(can_view: true) }
end
