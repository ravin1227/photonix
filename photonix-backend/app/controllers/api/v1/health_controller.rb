module Api
  module V1
    class HealthController < ActionController::API
      def show
        # Check database connection
        db_status = check_database

        # Check Redis connection
        redis_status = check_redis

        # Check face detection service
        face_detection_status = check_face_detection

        overall_status = db_status && redis_status ? 'healthy' : 'unhealthy'

        render json: {
          status: overall_status,
          timestamp: Time.current.iso8601,
          version: '1.0.0',
          services: {
            database: db_status ? 'up' : 'down',
            redis: redis_status ? 'up' : 'down',
            face_detection: face_detection_status ? 'up' : 'down'
          },
          server_url: Setting.server_url,
          features: {
            face_detection: Setting.face_detection_enabled?,
            qr_login: Setting.qr_login_enabled?
          }
        }, status: overall_status == 'healthy' ? :ok : :service_unavailable
      end

      private

      def check_database
        ActiveRecord::Base.connection.active?
      rescue StandardError
        false
      end

      def check_redis
        Redis.new(url: ENV['REDIS_URL'] || 'redis://localhost:6379/0').ping == 'PONG'
      rescue StandardError
        false
      end

      def check_face_detection
        return false unless Setting.face_detection_enabled?

        FaceDetectionService.healthy?
      rescue StandardError
        false
      end
    end
  end
end
