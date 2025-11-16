require 'fileutils'
require 'digest'

class PhotoStorageService
  STORAGE_ROOT = ENV.fetch('STORAGE_ROOT', Rails.root.join('storage')).to_s
  ORIGINALS_PATH = 'originals'
  THUMBNAILS_PATH = 'thumbnails'

  THUMBNAIL_SIZES = {
    small: { width: 200, height: 200 },
    medium: { width: 800, height: 800 },
    large: { width: 1600, height: 1600 }
  }.freeze

  class << self
    # Store an uploaded photo
    # @param file [ActionDispatch::Http::UploadedFile] The uploaded file
    # @param user [User] The user who owns the photo
    # @return [Hash] Storage information including checksum, file_path, file_size
    def store_photo(file, user)
      begin
      # Calculate checksum
      checksum = calculate_checksum(file)

        # Get file extension safely
        filename = file.original_filename || 'photo.jpg'
        extension = File.extname(filename)
        extension = '.jpg' if extension.empty?
        
        relative_path = generate_storage_path(checksum, extension)
        
        # Ensure all path components are strings
        storage_root = STORAGE_ROOT.to_s
        originals_path = ORIGINALS_PATH.to_s
        relative_path_str = relative_path.to_s
        
        full_path = File.join(storage_root, originals_path, relative_path_str)

      # Create directory if it doesn't exist
        dir_path = File.dirname(full_path)
        FileUtils.mkdir_p(dir_path)

        # Copy file to storage - Rails UploadedFile has a path method
        source_path = if file.respond_to?(:path) && file.path
                        file.path.to_s
                      elsif file.respond_to?(:tempfile) && file.tempfile
                        file.tempfile.path.to_s
                      else
                        raise ArgumentError, "Unable to determine file path for uploaded file"
                      end
        FileUtils.cp(source_path, full_path)

      {
        checksum: checksum,
        file_path: relative_path,
        file_size: File.size(full_path),
          format: extension.delete('.').downcase.presence || 'jpg'
      }
      rescue => e
        Rails.logger.error "PhotoStorageService.store_photo error: #{e.class} - #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        raise
      end
    end

    # Get the full path to an original photo
    # @param relative_path [String] The relative path stored in the database
    # @return [String] Full filesystem path
    def original_path(relative_path)
      File.join(STORAGE_ROOT, ORIGINALS_PATH, relative_path)
    end

    # Get the full path to a thumbnail
    # @param relative_path [String] The relative path of the original
    # @param size [Symbol] Thumbnail size (:small, :medium, :large)
    # @return [String] Full filesystem path to thumbnail
    def thumbnail_path(relative_path, size)
      File.join(STORAGE_ROOT, THUMBNAILS_PATH, size.to_s, relative_path)
    end

    # Check if a photo exists in storage
    # @param relative_path [String] The relative path
    # @return [Boolean]
    def exists?(relative_path)
      File.exist?(original_path(relative_path))
    end

    # Check if a thumbnail exists
    # @param relative_path [String] The relative path of the original
    # @param size [Symbol] Thumbnail size
    # @return [Boolean]
    def thumbnail_exists?(relative_path, size)
      File.exist?(thumbnail_path(relative_path, size))
    end

    # Delete a photo and all its thumbnails
    # @param relative_path [String] The relative path
    # @return [Boolean] Success status
    def delete_photo(relative_path)
      deleted = false

      # Delete original
      if exists?(relative_path)
        FileUtils.rm(original_path(relative_path))
        deleted = true
      end

      # Delete thumbnails
      THUMBNAIL_SIZES.keys.each do |size|
        thumb_path = thumbnail_path(relative_path, size)
        FileUtils.rm(thumb_path) if File.exist?(thumb_path)
      end

      deleted
    end

    # Get storage statistics
    # @return [Hash] Storage stats including total size, photo count
    def storage_stats
      total_size = 0
      photo_count = 0

      originals_dir = File.join(STORAGE_ROOT, ORIGINALS_PATH)
      if Dir.exist?(originals_dir)
        Dir.glob(File.join(originals_dir, '**', '*')).each do |file|
          if File.file?(file)
            total_size += File.size(file)
            photo_count += 1
          end
        end
      end

      {
        total_size: total_size,
        photo_count: photo_count,
        total_size_mb: (total_size / 1024.0 / 1024.0).round(2),
        total_size_gb: (total_size / 1024.0 / 1024.0 / 1024.0).round(2)
      }
    end

    private

    # Calculate SHA256 checksum of a file
    # @param file [ActionDispatch::Http::UploadedFile] The uploaded file
    # @return [String] Hex checksum
    def calculate_checksum(file)
      # Rails UploadedFile provides a path method that returns tempfile.path
      # Fallback to tempfile.path if path method doesn't work
      file_path = if file.respond_to?(:path) && file.path
                    file.path.to_s
                  elsif file.respond_to?(:tempfile) && file.tempfile
                    file.tempfile.path.to_s
                  else
                    raise ArgumentError, "Unable to determine file path for uploaded file"
                  end
      Digest::SHA256.file(file_path).hexdigest
    end

    # Generate a storage path from checksum
    # Creates a hierarchical structure: year/month/ab/abcd1234...ext
    # @param checksum [String] The file checksum
    # @param extension [String] File extension
    # @return [String] Relative storage path
    def generate_storage_path(checksum, extension)
      date = Time.current
      year = date.year.to_s
      month = date.month.to_s.rjust(2, '0')
      prefix = checksum[0..1]

      File.join(year, month, prefix, "#{checksum}#{extension}")
    end
  end
end
