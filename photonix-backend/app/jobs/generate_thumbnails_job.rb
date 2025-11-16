require 'mini_magick'

class GenerateThumbnailsJob < ApplicationJob
  queue_as :default

  # Generate thumbnails for a photo
  # @param photo_id [Integer] The ID of the photo
  def perform(photo_id)
    photo = Photo.find(photo_id)
    original_path = PhotoStorageService.original_path(photo.file_path)

    unless File.exist?(original_path)
      Rails.logger.error "Original photo not found: #{original_path}"
      photo.update(processing_status: :failed)
      return
    end

    begin
      # Update status to processing
      photo.update(processing_status: :processing)

      # Generate thumbnails for each size
      PhotoStorageService::THUMBNAIL_SIZES.each do |size, dimensions|
        generate_thumbnail(photo, original_path, size, dimensions)
      end

      # Update status to completed
      photo.update(processing_status: :completed)
      Rails.logger.info "Generated thumbnails for photo #{photo.id}"
    rescue StandardError => e
      Rails.logger.error "Failed to generate thumbnails for photo #{photo.id}: #{e.message}"
      photo.update(processing_status: :failed)
      raise
    end
  end

  private

  def generate_thumbnail(photo, original_path, size, dimensions)
    thumbnail_path = PhotoStorageService.thumbnail_path(photo.file_path, size)

    # Create directory if it doesn't exist
    FileUtils.mkdir_p(File.dirname(thumbnail_path))

    # Skip if thumbnail already exists
    return if File.exist?(thumbnail_path)

    # Generate thumbnail using MiniMagick
    image = MiniMagick::Image.open(original_path)
    image.resize "#{dimensions[:width]}x#{dimensions[:height]}>"
    image.auto_orient
    image.strip # Remove EXIF data from thumbnails for privacy
    image.write thumbnail_path

    Rails.logger.debug "Generated #{size} thumbnail for photo #{photo.id}"
  rescue StandardError => e
    Rails.logger.error "Failed to generate #{size} thumbnail: #{e.message}"
    raise
  end
end
