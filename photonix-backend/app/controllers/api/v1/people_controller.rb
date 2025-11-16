module Api
  module V1
    class PeopleController < Api::BaseController
      include Authenticatable
      before_action :set_person, only: [:show, :update, :destroy]

      # GET /api/v1/people
      def index
        # Get people who have faces in photos owned by current user
        people = Person.joins(faces: :photo)
                       .where(photos: { user_id: current_user.id, deleted_at: nil })
                       .distinct
                       .order(face_count: :desc, created_at: :desc)
                       .page(params[:page])
                       .per(params[:per_page] || 50)

        render json: {
          people: people.map { |person| person_response(person) },
          meta: pagination_meta(people)
        }
      end

      # GET /api/v1/people/:id
      def show
        photos = @person.photos
                        .where(user_id: current_user.id, deleted_at: nil)
                        .distinct
                        .order(created_at: :desc)
                        .page(params[:page])
                        .per(params[:per_page] || 50)

        render json: {
          person: person_detail_response(@person),
          photos: photos.map { |photo| photo_response(photo) },
          meta: pagination_meta(photos)
        }
      end

      # PUT /api/v1/people/:id
      def update
        if @person.update(person_params)
          render json: {
            message: 'Person updated successfully',
            person: person_response(@person)
          }
        else
          render json: { errors: @person.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/people/:id
      def destroy
        # Unassign all faces from this person
        @person.faces.update_all(person_id: nil)
        @person.destroy

        render json: { message: 'Person deleted successfully' }
      end

      # POST /api/v1/people/:id/merge
      def merge
        source_person_id = params[:source_person_id]

        unless source_person_id
          render json: { error: 'source_person_id is required' }, status: :unprocessable_entity
          return
        end

        source_person = Person.find(source_person_id)
        target_person = Person.find(params[:id])

        # Move all faces from source to target
        source_person.faces.update_all(person_id: target_person.id)

        # Update face counts
        source_person.update_face_count
        target_person.update_face_count

        # Delete source person if empty
        source_person.destroy if source_person.faces.count.zero?

        render json: {
          message: 'People merged successfully',
          person: person_response(target_person.reload)
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Person not found' }, status: :not_found
      end

      # GET /api/v1/people/:id/faces
      def faces
        person = Person.find(params[:id])
        faces = person.faces.includes(:photo).page(params[:page]).per(params[:per_page] || 50)

        render json: {
          faces: faces.map { |face| face_response(face) },
          meta: pagination_meta(faces)
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Person not found' }, status: :not_found
      end

      private

      def set_person
        @person = Person.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Person not found' }, status: :not_found
      end

      def person_params
        params.require(:person).permit(:name, :user_confirmed)
      end

      def person_response(person)
        {
          id: person.id,
          name: person.name || "Person ##{person.id}",
          face_count: person.face_count || person.faces.count,
          photo_count: person.photos.distinct.count,
          user_confirmed: person.user_confirmed,
          thumbnail_url: person_thumbnail_url(person),
          created_at: person.created_at
        }
      end

      def person_detail_response(person)
        person_response(person).merge(
          faces: person.faces.limit(10).map { |face| face_response(face) }
        )
      end

      def face_response(face)
        {
          id: face.id,
          photo_id: face.photo_id,
          bounding_box: face.bounding_box,
          confidence: face.confidence,
          thumbnail_url: face_thumbnail_url(face)
        }
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
          created_at: photo.created_at
        }
      end

      def person_thumbnail_url(person)
        # Use the first face's thumbnail as person thumbnail
        first_face = person.faces.where.not(thumbnail_path: nil).first
        return nil unless first_face

        face_thumbnail_url(first_face)
      end

      def face_thumbnail_url(face)
        return nil unless face.thumbnail_path

        "#{request.protocol}#{request.host_with_port}/api/v1/faces/#{face.id}/thumbnail"
      end

      def thumbnail_url(photo, size)
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
