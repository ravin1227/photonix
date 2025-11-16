require 'exifr/jpeg'
require 'exifr/tiff'
require 'mini_magick'

class ExifExtractionService
  class << self
    # Extract EXIF data from a photo file
    # @param file_path [String] Full path to the photo file
    # @return [Hash] Extracted EXIF data
    def extract(file_path)
      return {} unless File.exist?(file_path)

      begin
        extension = File.extname(file_path).downcase
        exif_data = case extension
                    when '.jpg', '.jpeg'
                      extract_from_jpeg(file_path)
                    when '.tiff', '.tif'
                      extract_from_tiff(file_path)
                    else
                      extract_with_minimagick(file_path)
                    end

        exif_data.compact
      rescue StandardError => e
        Rails.logger.error "Failed to extract EXIF from #{file_path}: #{e.message}"
        {}
      end
    end

    private

    def extract_from_jpeg(file_path)
      exif = EXIFR::JPEG.new(file_path)
      return {} unless exif

      extract_common_data(exif)
    end

    def extract_from_tiff(file_path)
      exif = EXIFR::TIFF.new(file_path)
      return {} unless exif

      extract_common_data(exif)
    end

    def extract_with_minimagick(file_path)
      image = MiniMagick::Image.open(file_path)
      {
        width: image.width,
        height: image.height
      }
    end

    def extract_common_data(exif)
      {
        width: exif.width,
        height: exif.height,
        captured_at: extract_datetime(exif),
        camera_make: exif.make,
        camera_model: exif.model,
        iso: exif.iso_speed_ratings&.first,
        aperture: exif.f_number&.to_f,
        shutter_speed: format_shutter_speed(exif.exposure_time),
        focal_length: exif.focal_length&.to_i,
        latitude: exif.gps&.latitude,
        longitude: exif.gps&.longitude,
        altitude: exif.gps&.altitude
      }
    end

    def extract_datetime(exif)
      # Try multiple datetime fields in order of preference
      datetime = exif.date_time_original || exif.date_time_digitized || exif.date_time

      return nil unless datetime

      # Handle different datetime formats
      case datetime
      when Time, DateTime
        datetime
      when String
        begin
          Time.parse(datetime)
        rescue ArgumentError
          nil
        end
      else
        nil
      end
    end

    def format_shutter_speed(exposure_time)
      return nil unless exposure_time

      if exposure_time.respond_to?(:to_r)
        rational = exposure_time.to_r
        if rational.denominator == 1
          "#{rational.numerator}s"
        else
          "1/#{rational.denominator}"
        end
      else
        exposure_time.to_s
      end
    end
  end
end
