class PhotoAlbum < ApplicationRecord
  belongs_to :photo
  belongs_to :album

  # Validations
  validates :photo_id, uniqueness: { scope: :album_id }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  # Scopes
  default_scope -> { order(position: :asc) }
end
