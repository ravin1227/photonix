# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_12_07_135241) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "album_auto_syncs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "device_album_upload_id"
    t.boolean "enabled", default: false, null: false
    t.integer "last_photo_count", default: 0, null: false
    t.datetime "last_sync_at"
    t.integer "new_photos_since_sync", default: 0, null: false
    t.bigint "server_album_id", null: false
    t.string "sync_frequency", default: "manual", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["device_album_upload_id", "server_album_id"], name: "idx_auto_sync_unique", unique: true
    t.index ["device_album_upload_id"], name: "index_album_auto_syncs_on_device_album_upload_id"
    t.index ["enabled"], name: "index_album_auto_syncs_on_enabled"
    t.index ["server_album_id"], name: "index_album_auto_syncs_on_server_album_id"
    t.index ["user_id"], name: "index_album_auto_syncs_on_user_id"
  end

  create_table "album_users", force: :cascade do |t|
    t.bigint "album_id", null: false
    t.boolean "can_contribute", default: false, null: false
    t.boolean "can_view", default: true, null: false
    t.datetime "created_at", null: false
    t.boolean "is_owner", default: false, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["album_id", "user_id"], name: "index_album_users_on_album_id_and_user_id", unique: true
    t.index ["album_id"], name: "index_album_users_on_album_id"
    t.index ["user_id"], name: "index_album_users_on_user_id"
  end

  create_table "albums", force: :cascade do |t|
    t.string "album_type"
    t.integer "cover_photo_id"
    t.datetime "created_at", null: false
    t.bigint "created_by_id"
    t.text "description"
    t.boolean "is_shared", default: false, null: false
    t.string "name"
    t.string "privacy"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["created_by_id"], name: "index_albums_on_created_by_id"
    t.index ["user_id"], name: "index_albums_on_user_id"
  end

  create_table "device_album_uploads", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "device_album_id", null: false
    t.string "device_album_name", null: false
    t.string "device_type", null: false
    t.datetime "last_upload_at"
    t.bigint "server_album_id"
    t.integer "total_device_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.integer "uploaded_count", default: 0, null: false
    t.bigint "user_id", null: false
    t.index ["last_upload_at"], name: "index_device_album_uploads_on_last_upload_at"
    t.index ["server_album_id"], name: "index_device_album_uploads_on_server_album_id"
    t.index ["user_id", "device_album_id", "device_type"], name: "idx_device_uploads_unique", unique: true
    t.index ["user_id"], name: "index_device_album_uploads_on_user_id"
  end

  create_table "faces", force: :cascade do |t|
    t.float "bbox_height"
    t.float "bbox_width"
    t.float "bbox_x"
    t.float "bbox_y"
    t.float "confidence"
    t.datetime "created_at", null: false
    t.text "face_encoding"
    t.bigint "person_id"
    t.bigint "photo_id", null: false
    t.float "quality_score"
    t.string "thumbnail_path"
    t.datetime "updated_at", null: false
    t.index ["person_id"], name: "index_faces_on_person_id"
    t.index ["photo_id"], name: "index_faces_on_photo_id"
  end

  create_table "login_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.boolean "used", default: false
    t.bigint "user_id", null: false
    t.index ["expires_at"], name: "index_login_tokens_on_expires_at"
    t.index ["token"], name: "index_login_tokens_on_token", unique: true
    t.index ["user_id"], name: "index_login_tokens_on_user_id"
  end

  create_table "people", force: :cascade do |t|
    t.integer "cover_face_id"
    t.datetime "created_at", null: false
    t.integer "face_count"
    t.string "name"
    t.datetime "updated_at", null: false
    t.boolean "user_confirmed"
  end

  create_table "photo_albums", force: :cascade do |t|
    t.bigint "album_id", null: false
    t.datetime "created_at", null: false
    t.bigint "photo_id", null: false
    t.integer "position"
    t.datetime "updated_at", null: false
    t.index ["album_id"], name: "index_photo_albums_on_album_id"
    t.index ["photo_id"], name: "index_photo_albums_on_photo_id"
  end

  create_table "photo_tags", force: :cascade do |t|
    t.decimal "confidence"
    t.datetime "created_at", null: false
    t.bigint "photo_id", null: false
    t.string "source"
    t.bigint "tag_id", null: false
    t.datetime "updated_at", null: false
    t.index ["photo_id"], name: "index_photo_tags_on_photo_id"
    t.index ["tag_id"], name: "index_photo_tags_on_tag_id"
  end

  create_table "photos", force: :cascade do |t|
    t.decimal "altitude"
    t.decimal "aperture"
    t.string "camera_make"
    t.string "camera_model"
    t.datetime "captured_at"
    t.string "checksum"
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "file_path"
    t.bigint "file_size"
    t.integer "focal_length"
    t.string "format"
    t.integer "height"
    t.integer "iso"
    t.decimal "latitude"
    t.decimal "longitude"
    t.string "original_filename"
    t.string "processing_status"
    t.string "sha1_hash"
    t.string "shutter_speed"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "width"
    t.index ["captured_at"], name: "index_photos_on_captured_at"
    t.index ["user_id", "captured_at"], name: "index_photos_on_user_id_and_captured_at"
    t.index ["user_id", "sha1_hash"], name: "index_photos_on_user_id_and_sha1_hash"
    t.index ["user_id"], name: "index_photos_on_user_id"
  end

  create_table "settings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description"
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.text "value"
    t.index ["key"], name: "index_settings_on_key", unique: true
  end

  create_table "tags", force: :cascade do |t|
    t.string "category"
    t.datetime "created_at", null: false
    t.string "name"
    t.string "tag_type"
    t.datetime "updated_at", null: false
    t.integer "usage_count"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name"
    t.string "password_digest"
    t.string "role", default: "user", null: false
    t.bigint "storage_quota"
    t.datetime "updated_at", null: false
    t.index ["role"], name: "index_users_on_role"
  end

  add_foreign_key "album_auto_syncs", "albums", column: "server_album_id"
  add_foreign_key "album_auto_syncs", "device_album_uploads"
  add_foreign_key "album_auto_syncs", "users"
  add_foreign_key "album_users", "albums"
  add_foreign_key "album_users", "users"
  add_foreign_key "albums", "users"
  add_foreign_key "albums", "users", column: "created_by_id"
  add_foreign_key "device_album_uploads", "albums", column: "server_album_id"
  add_foreign_key "device_album_uploads", "users"
  add_foreign_key "faces", "people"
  add_foreign_key "faces", "photos"
  add_foreign_key "login_tokens", "users"
  add_foreign_key "photo_albums", "albums"
  add_foreign_key "photo_albums", "photos"
  add_foreign_key "photo_tags", "photos"
  add_foreign_key "photo_tags", "tags"
  add_foreign_key "photos", "users"
end
