require 'net/http'
require 'json'

class FaceDetectionService
  FACE_DETECTION_URL = ENV.fetch('FACE_DETECTION_SERVICE_URL', 'http://localhost:8000')

  class << self
    # Detect faces in an image file
    # @param image_path [String] Full path to the image file
    # @return [Hash] Response with faces data
    def detect_faces(image_path)
      uri = URI("#{FACE_DETECTION_URL}/detect-faces")

      # Translate path from Rails container (/rails/storage) to face-detection container (/storage)
      translated_path = image_path.gsub('/rails/storage', '/storage')

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request.body = {
        image_path: translated_path
      }.to_json

      response = send_request(uri, request)

      if response.is_a?(Net::HTTPSuccess)
        JSON.parse(response.body)
      else
        Rails.logger.error "Face detection failed: #{response.code} - #{response.body}"
        { 'success' => false, 'faces' => [], 'message' => 'Face detection failed', 'face_count' => 0 }
      end
    rescue StandardError => e
      Rails.logger.error "Face detection error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      { 'success' => false, 'faces' => [], 'message' => e.message, 'face_count' => 0 }
    end

    # Compare a face encoding with known encodings
    # @param face_encoding [Array<Float>] The face encoding to compare (128-D vector)
    # @param known_encodings [Array<Array<Float>>] Array of known face encodings
    # @param tolerance [Float] Match tolerance (default 0.6)
    # @return [Hash] Response with match information
    def compare_faces(face_encoding, known_encodings, tolerance: 0.6)
      uri = URI("#{FACE_DETECTION_URL}/compare-faces")

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request.body = {
        face_encoding: face_encoding,
        known_encodings: known_encodings,
        tolerance: tolerance
      }.to_json

      response = send_request(uri, request)

      if response.is_a?(Net::HTTPSuccess)
        JSON.parse(response.body)
      else
        Rails.logger.error "Face comparison failed: #{response.code} - #{response.body}"
        { 'matches' => [], 'best_match_index' => nil, 'best_match_distance' => nil }
      end
    rescue StandardError => e
      Rails.logger.error "Face comparison error: #{e.message}"
      { 'matches' => [], 'best_match_index' => nil, 'best_match_distance' => nil }
    end

    # Health check for the face detection service
    # @return [Boolean] True if service is healthy
    def healthy?
      uri = URI("#{FACE_DETECTION_URL}/health")
      request = Net::HTTP::Get.new(uri)

      response = send_request(uri, request, timeout: 5)
      response.is_a?(Net::HTTPSuccess)
    rescue StandardError => e
      Rails.logger.error "Face detection service health check failed: #{e.message}"
      false
    end

    private

    def send_request(uri, request, timeout: 60)
      Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https', read_timeout: timeout, open_timeout: timeout) do |http|
        http.request(request)
      end
    end
  end
end
