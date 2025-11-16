class DetectFacesJob < ApplicationJob
  queue_as :default

  # Detect faces in a photo and create Face records
  # @param photo_id [Integer] The ID of the photo
  def perform(photo_id)
    photo = Photo.find(photo_id)
    original_path = PhotoStorageService.original_path(photo.file_path)

    unless File.exist?(original_path)
      Rails.logger.error "Photo file not found: #{original_path}"
      return
    end

    begin
      Rails.logger.info "Detecting faces for photo #{photo.id}"

      # Call face detection service
      result = FaceDetectionService.detect_faces(original_path)

      unless result['success']
        Rails.logger.error "Face detection failed for photo #{photo.id}: #{result['message']}"
        return
      end

      faces_data = result['faces'] || []

      if faces_data.empty?
        Rails.logger.info "No faces detected in photo #{photo.id}"
        return
      end

      Rails.logger.info "Detected #{faces_data.length} face(s) in photo #{photo.id}"

      # Process each detected face
      faces_data.each_with_index do |face_data, index|
        process_detected_face(photo, face_data, index)
      end

      Rails.logger.info "Successfully processed #{faces_data.length} face(s) for photo #{photo.id}"
    rescue StandardError => e
      Rails.logger.error "Failed to detect faces for photo #{photo.id}: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      raise
    end
  end

  private

  def process_detected_face(photo, face_data, index)
    bbox = face_data['bounding_box']
    encoding = face_data['encoding']
    thumbnail_base64 = face_data['thumbnail_base64']

    # Create Face record
    face = photo.faces.create!(
      bbox_x: bbox['left'],
      bbox_y: bbox['top'],
      bbox_width: bbox['width'],
      bbox_height: bbox['height'],
      confidence: face_data['confidence'] || 0.95,
      face_encoding: encoding.to_json
    )

    # Save face thumbnail if available
    if thumbnail_base64.present?
      save_face_thumbnail(face, thumbnail_base64)
    end

    # Try to match with existing person or create new person
    person = find_or_create_person_for_face(face)

    if person
      face.update(person_id: person.id)
      person.update_face_count
      Rails.logger.info "Assigned face #{face.id} to person #{person.id}"
    end

    face
  end

  def save_face_thumbnail(face, thumbnail_base64)
    # Decode base64 thumbnail
    image_data = Base64.decode64(thumbnail_base64)

    # Generate thumbnail path
    thumbnail_dir = File.join(PhotoStorageService::STORAGE_ROOT, 'face_thumbnails')
    FileUtils.mkdir_p(thumbnail_dir)

    thumbnail_filename = "face_#{face.id}_#{SecureRandom.hex(8)}.jpg"
    thumbnail_path = File.join(thumbnail_dir, thumbnail_filename)

    # Save thumbnail
    File.binwrite(thumbnail_path, image_data)

    # Update face record with thumbnail path
    relative_path = "face_thumbnails/#{thumbnail_filename}"
    face.update(thumbnail_path: relative_path)

    Rails.logger.debug "Saved face thumbnail: #{relative_path}"
  rescue StandardError => e
    Rails.logger.error "Failed to save face thumbnail: #{e.message}"
  end

  def find_or_create_person_for_face(face)
    return nil unless face.encoding.present?

    # Get all people with face encodings
    people_with_faces = Person.includes(:faces).where.not(faces: { face_encoding: nil }).distinct

    if people_with_faces.empty?
      # No existing people, create new person
      return create_new_person(face)
    end

    # Collect all known encodings with their person IDs
    known_encodings = []
    person_ids = []

    people_with_faces.each do |person|
      # Use the first face encoding as representative for this person
      representative_face = person.faces.with_encoding.first
      next unless representative_face

      known_encodings << representative_face.encoding
      person_ids << person.id
    end

    return create_new_person(face) if known_encodings.empty?

    # Compare with known faces
    result = FaceDetectionService.compare_faces(
      face.encoding,
      known_encodings,
      tolerance: 0.6
    )

    best_match_index = result['best_match_index']

    if best_match_index.present?
      # Found a match, return existing person
      person_id = person_ids[best_match_index]
      person = Person.find(person_id)
      Rails.logger.info "Matched face to existing person #{person.id} (distance: #{result['best_match_distance']})"
      person
    else
      # No match found, create new person
      create_new_person(face)
    end
  rescue StandardError => e
    Rails.logger.error "Error in find_or_create_person_for_face: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    create_new_person(face)
  end

  def create_new_person(face)
    person = Person.create!(
      name: nil,  # Will be named later by user
      face_count: 0,
      user_confirmed: false
    )

    Rails.logger.info "Created new person #{person.id} for face #{face.id}"
    person
  end
end
