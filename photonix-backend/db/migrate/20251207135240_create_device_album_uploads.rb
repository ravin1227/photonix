class CreateDeviceAlbumUploads < ActiveRecord::Migration[8.1]
  def change
    create_table :device_album_uploads do |t|
      t.references :user, null: false, foreign_key: true
      t.string :device_album_id, null: false
      t.string :device_album_name, null: false
      t.references :server_album, foreign_key: { to_table: :albums }, null: true
      t.integer :uploaded_count, default: 0, null: false
      t.integer :total_device_count, default: 0, null: false
      t.datetime :last_upload_at
      t.string :device_type, null: false
      t.timestamps
    end

    add_index :device_album_uploads, [:user_id, :device_album_id, :device_type], unique: true, name: 'idx_device_uploads_unique'
    add_index :device_album_uploads, :last_upload_at
  end
end
