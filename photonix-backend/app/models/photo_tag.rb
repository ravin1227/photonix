class PhotoTag < ApplicationRecord
  belongs_to :photo
  belongs_to :tag

  # Validations
  validates :photo_id, uniqueness: { scope: :tag_id }
  validates :source, inclusion: { in: %w[user ai] }
  validates :confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }, allow_nil: true

  # Callbacks
  after_create :increment_tag_usage_count
  after_destroy :decrement_tag_usage_count

  private

  def increment_tag_usage_count
    tag.increment!(:usage_count)
  end

  def decrement_tag_usage_count
    tag.decrement!(:usage_count)
  end
end
