module Api
  module V1
    class PhotosController < Api::BaseController
      include Authenticatable
      before_action :set_photo, only: [:show, :destroy, :download]

      # GET /api/v1/photos
      def index
        # Sort by captured_at (photo date) if available, fallback to created_at (upload date)
        photos = current_user.photos.active
                            .order(Arel.sql('COALESCE(captured_at, created_at) DESC'))
                            .page(params[:page])
                            .per(params[:per_page] || 50)

        render json: {
          photos: photos.map { |photo| photo_response(photo) },
          meta: pagination_meta(photos)
        }
      end

      # GET /api/v1/photos/:id
      def show
        render json: { photo: photo_detail_response(@photo) }
      end

      # POST /api/v1/photos/check_bulk_upload
      # Check which photos already exist on server before uploading
      # Accepts array of SHA-1 hashes and returns existing hashes with photo IDs
      # This prevents uploading duplicates and saves bandwidth
      def check_bulk_upload
        checksums = params[:checksums] || []
        
        unless checksums.is_a?(Array) && checksums.length > 0
          render json: { error: 'checksums parameter must be a non-empty array' }, status: :bad_request
          return
        end

        # Limit batch size to prevent abuse (max 50 checksums per request)
        if checksums.length > 50
          render json: { error: 'Maximum 50 checksums per request' }, status: :bad_request
          return
        end

        # Find existing photos by SHA-1 hash (O(1) lookup with index)
        # Return hash -> photo_id mapping for easy lookup
        existing_photos = current_user.photos.active
                                      .where(sha1_hash: checksums)
                                      .select(:id, :sha1_hash)
        
        existing_hash_map = existing_photos.index_by(&:sha1_hash)
        existing_hashes = existing_hash_map.keys.compact.uniq

        render json: {
          existing_hashes: existing_hashes,
          existing_photos: existing_hash_map.transform_values { |photo| { id: photo.id } },
          total_checked: checksums.length,
          existing_count: existing_hashes.length,
          new_count: checksums.length - existing_hashes.length
        }
      end

      # POST /api/v1/photos
      # Handles both single and multiple photo uploads
      def create
        # Detect single or bulk upload
        uploaded_files = params[:photos] || (params[:photo] ? [params[:photo]] : nil)

        unless uploaded_files
          render json: { error: 'No photo file(s) provided. Use "photo" for single upload or "photos[]" for multiple.' }, status: :unprocessable_entity
          return
        end

        # Ensure it's an array
        uploaded_files = Array(uploaded_files)
        is_single_upload = params[:photo].present?

        results = {
          successful: [],
          failed: []
        }

        uploaded_files.each_with_index do |uploaded_file, index|
          begin
            # First, check if this file already exists by checksum (before storing)
            # This prevents unnecessary file storage for duplicates
            temp_checksum = nil
            temp_sha1 = nil

            # Quick checksum calculation from uploaded file for duplicate detection
            if uploaded_file.respond_to?(:path) && uploaded_file.path
              temp_checksum = Digest::SHA256.file(uploaded_file.path).hexdigest
              temp_sha1 = Digest::SHA1.file(uploaded_file.path).hexdigest
            elsif uploaded_file.respond_to?(:tempfile) && uploaded_file.tempfile
              temp_checksum = Digest::SHA256.file(uploaded_file.tempfile.path).hexdigest
              temp_sha1 = Digest::SHA1.file(uploaded_file.tempfile.path).hexdigest
            end

            # Check if photo with this checksum already exists
            existing_photo = nil
            if temp_checksum
              existing_photo = current_user.photos.active.find_by(checksum: temp_checksum) ||
                              (temp_sha1 && current_user.photos.active.find_by(sha1_hash: temp_sha1))
            end

            if existing_photo
              # Photo already exists - don't store file again
              Rails.logger.info "Duplicate photo detected (checksum: #{temp_checksum}, sha1: #{temp_sha1}), returning existing photo ID #{existing_photo.id}"

              results[:successful] << {
                index: index,
                filename: uploaded_file.original_filename,
                photo: photo_response(existing_photo),
                duplicate: true
              }
            else
              # Create photo record first (to get the ID for file storage path)
              photo = current_user.photos.new(
                original_filename: uploaded_file.original_filename,
                processing_status: 'pending'
              )

              if photo.save
                # Now store the file using the photo ID as the path
                storage_info = PhotoStorageService.store_photo(uploaded_file, photo.id)

                # Extract EXIF data from the stored file
                full_path = PhotoStorageService.original_path(storage_info[:file_path])
                exif_data = ExifExtractionService.extract(full_path)

                # Use captured_at from params if provided and EXIF didn't extract it
                if exif_data[:captured_at].nil?
                  captured_at_value = nil

                  # Check for array format first (captured_at[] from bulk upload)
                  if params[:captured_at].is_a?(Array) && params[:captured_at][index].present?
                    captured_at_value = params[:captured_at][index]
                  # Fallback to single value (for single uploads or if array index doesn't exist)
                  elsif params[:captured_at].present? && !params[:captured_at].is_a?(Array)
                    captured_at_value = params[:captured_at]
                  end

                  if captured_at_value.present?
                    exif_data[:captured_at] = captured_at_value
                    Rails.logger.info "Using captured_at from params for photo #{photo.id}: #{captured_at_value}"
                  end
                end

                # Update photo record with file and EXIF data
                photo.update(
                  file_path: storage_info[:file_path],
                  file_size: storage_info[:file_size],
                  format: storage_info[:format],
                  checksum: storage_info[:checksum],
                  sha1_hash: storage_info[:sha1_hash],
                  **exif_data
                )

                # Enqueue thumbnail generation
                GenerateThumbnailsJob.perform_later(photo.id)

                # Enqueue face detection
                DetectFacesJob.perform_later(photo.id)

                results[:successful] << {
                  index: index,
                  filename: uploaded_file.original_filename,
                  photo: photo_response(photo)
                }
              else
                # Failed to create photo record
                results[:failed] << {
                  index: index,
                  filename: uploaded_file.original_filename,
                  errors: photo.errors.full_messages
                }
              end
            end
          rescue StandardError => e
            Rails.logger.error "Upload failed for file #{index} (#{uploaded_file&.original_filename}): #{e.class} - #{e.message}"
            Rails.logger.error e.backtrace.join("\n")
            results[:failed] << {
              index: index,
              filename: uploaded_file&.original_filename || "unknown",
              errors: [e.message]
            }
          end
        end

        # Return response based on single or bulk upload
        if is_single_upload
          # Single upload response format
          if results[:successful].any?
            render json: {
              message: 'Photo uploaded successfully',
              photo: results[:successful].first[:photo]
            }, status: :created
          else
            render json: {
              error: 'Photo upload failed',
              errors: results[:failed].first[:errors]
            }, status: :unprocessable_entity
          end
        else
          # Bulk upload response format
          status_code = results[:failed].empty? ? :created : (results[:successful].empty? ? :unprocessable_entity : :multi_status)

          render json: {
            message: "Processed #{uploaded_files.length} photo(s)",
            summary: {
              total: uploaded_files.length,
              successful: results[:successful].length,
              failed: results[:failed].length
            },
            results: results
          }, status: status_code
        end
      end

      # DELETE /api/v1/photos/:id
      def destroy
        if @photo.soft_delete
          render json: { message: 'Photo deleted successfully' }, status: :ok
        else
          render json: { error: 'Failed to delete photo' }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/photos/:id/download
      def download
        file_path = PhotoStorageService.original_path(@photo.file_path)

        if File.exist?(file_path)
          # Use 'inline' disposition for image viewing in browsers/apps
          # Use 'attachment' if you want to force download
          send_file file_path, 
                    filename: @photo.original_filename, 
                    type: "image/#{@photo.format || 'jpeg'}", 
                    disposition: 'inline'
        else
          render json: { error: 'Photo file not found' }, status: :not_found
        end
      end

      # GET /api/v1/photos/:id/thumbnail/:size
      def thumbnail
        # Find photo owned by user OR in albums accessible to user
        photo = Photo.joins('LEFT JOIN photo_albums ON photo_albums.photo_id = photos.id')
                     .joins('LEFT JOIN albums ON albums.id = photo_albums.album_id')
                     .joins('LEFT JOIN album_users ON album_users.album_id = albums.id')
                     .where('photos.id = ?', params[:id])
                     .where('photos.user_id = ? OR albums.user_id = ? OR albums.created_by_id = ? OR album_users.user_id = ?',
                            current_user.id, current_user.id, current_user.id, current_user.id)
                     .distinct
                     .first

        unless photo
          render json: { error: 'Photo not found or access denied' }, status: :not_found
          return
        end

        size = params[:size]&.to_sym || :medium

        unless PhotoStorageService::THUMBNAIL_SIZES.key?(size)
          render json: { error: 'Invalid thumbnail size' }, status: :bad_request
          return
        end

        begin
        thumbnail_file = PhotoStorageService.thumbnail_path(photo.file_path, size)

        if File.exist?(thumbnail_file)
            send_file thumbnail_file, type: "image/#{photo.format || 'jpeg'}", disposition: 'inline'
        else
          # Return original if thumbnail not ready yet
          original_file = PhotoStorageService.original_path(photo.file_path)
            
            unless File.exist?(original_file)
              Rails.logger.error "Original file not found: #{original_file} for photo #{photo.id}"
              render json: { error: 'Photo file not found' }, status: :not_found
              return
            end
            
            send_file original_file, type: "image/#{photo.format || 'jpeg'}", disposition: 'inline'
          end
        rescue StandardError => e
          Rails.logger.error "Thumbnail error for photo #{photo.id}: #{e.class} - #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          render json: { error: 'Failed to load thumbnail', details: e.message }, status: :internal_server_error
        end
      end

      private

      def set_photo
        # Find photo owned by user OR in albums accessible to user
        @photo = Photo.joins('LEFT JOIN photo_albums ON photo_albums.photo_id = photos.id')
                      .joins('LEFT JOIN albums ON albums.id = photo_albums.album_id')
                      .joins('LEFT JOIN album_users ON album_users.album_id = albums.id')
                      .where('photos.id = ?', params[:id])
                      .where('photos.user_id = ? OR albums.user_id = ? OR albums.created_by_id = ? OR album_users.user_id = ?',
                             current_user.id, current_user.id, current_user.id, current_user.id)
                      .distinct
                      .first

        unless @photo
          render json: { error: 'Photo not found or access denied' }, status: :not_found
        end
      end

      def photo_response(photo)
        {
          id: photo.id,
          original_filename: photo.original_filename,
          format: photo.format,
          file_size: photo.file_size,
          width: photo.width,
          height: photo.height,
          captured_at: photo.captured_at,
          processing_status: photo.processing_status,
          thumbnail_urls: {
            small: thumbnail_url(photo, :small),
            medium: thumbnail_url(photo, :medium),
            large: thumbnail_url(photo, :large)
          },
          uploaded_by: {
            id: photo.user_id,
            name: photo.user.name
          },
          is_mine: photo.user_id == current_user.id,
          created_at: photo.created_at
        }
      end

      def photo_detail_response(photo)
        photo_response(photo).merge(
          camera_make: photo.camera_make,
          camera_model: photo.camera_model,
          iso: photo.iso,
          aperture: photo.aperture,
          shutter_speed: photo.shutter_speed,
          focal_length: photo.focal_length,
          latitude: photo.latitude,
          longitude: photo.longitude,
          tags: photo.tags.map { |tag| { id: tag.id, name: tag.name, type: tag.tag_type } },
          albums: photo.albums.map { |album| { id: album.id, name: album.name } }
        )
      end

      def thumbnail_url(photo, size)
        # Generate absolute URL for API responses
        "#{request.protocol}#{request.host_with_port}/api/v1/photos/#{photo.id}/thumbnail/#{size}"
      end

      def pagination_meta(collection)
        {
          current_page: collection.current_page,
          total_pages: collection.total_pages,
          total_count: collection.total_count,
          per_page: collection.limit_value
        }
      end
    end
  end
end
