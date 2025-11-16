class Tag < ApplicationRecord
  # Associations
  has_many :photo_tags, dependent: :destroy
  has_many :photos, through: :photo_tags

  # Validations
  validates :name, presence: true, uniqueness: { scope: :tag_type }
  validates :tag_type, inclusion: { in: %w[user ai system] }

  # Enums
  enum :tag_type, {
    user: 'user',
    ai: 'ai',
    system: 'system'
  }, prefix: true

  # Callbacks
  before_create :set_default_usage_count

  # Scopes
  scope :popular, -> { where('usage_count > ?', 10).order(usage_count: :desc) }
  scope :by_category, ->(category) { where(category: category) }

  private

  def set_default_usage_count
    self.usage_count ||= 0
  end
end
