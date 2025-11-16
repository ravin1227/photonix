class Face < ApplicationRecord
  belongs_to :photo
  belongs_to :person, optional: true

  # Validations
  validates :bbox_x, :bbox_y, :bbox_width, :bbox_height, presence: true
  validates :quality_score, :confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }, allow_nil: true

  # Scopes
  scope :unassigned, -> { where(person_id: nil) }
  scope :high_quality, -> { where('quality_score > ?', 0.7) }
  scope :with_encoding, -> { where.not(face_encoding: nil) }

  # Methods
  def bounding_box
    {
      x: bbox_x,
      y: bbox_y,
      width: bbox_width,
      height: bbox_height
    }
  end

  # Parse face encoding from JSON string to array
  def encoding
    return nil unless face_encoding.present?
    JSON.parse(face_encoding)
  end

  # Set face encoding from array
  def encoding=(array)
    self.face_encoding = array.to_json
  end
end
