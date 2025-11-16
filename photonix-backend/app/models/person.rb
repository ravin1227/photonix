class Person < ApplicationRecord
  # Associations
  has_many :faces, dependent: :nullify
  has_many :photos, through: :faces
  belongs_to :cover_face, class_name: 'Face', optional: true

  # Validations
  validates :name, length: { maximum: 255 }, allow_nil: true

  # Callbacks
  before_create :set_default_face_count

  # Scopes
  scope :named, -> { where.not(name: nil) }
  scope :unnamed, -> { where(name: nil) }

  # Methods
  def update_face_count
    update(face_count: faces.count)
  end

  private

  def set_default_face_count
    self.face_count ||= 0
    self.user_confirmed ||= false
  end
end
