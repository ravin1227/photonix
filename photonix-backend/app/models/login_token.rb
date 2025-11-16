class LoginToken < ApplicationRecord
  belongs_to :user

  validates :token, presence: true, uniqueness: true
  validates :expires_at, presence: true

  before_validation :generate_token, on: :create
  before_validation :set_expiration, on: :create

  # Scopes
  scope :active, -> { where(used: false).where('expires_at > ?', Time.current) }
  scope :expired, -> { where('expires_at <= ?', Time.current) }

  # Check if token is valid (not used and not expired)
  def valid_token?
    !used && expires_at > Time.current
  end

  # Mark token as used
  def mark_as_used!
    update!(used: true)
  end

  # Generate QR code data
  def to_qr_data(base_url)
    {
      server_url: base_url,
      token: token,
      user_email: user.email,
      expires_at: expires_at.iso8601
    }.to_json
  end

  private

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_expiration
    # Token expires in 5 minutes
    self.expires_at ||= 5.minutes.from_now
  end
end
