class CreateAlbumAutoSyncs < ActiveRecord::Migration[8.1]
  def change
    create_table :album_auto_syncs do |t|
      t.references :user, null: false, foreign_key: true
      t.references :device_album_upload, foreign_key: true, null: true
      t.references :server_album, foreign_key: { to_table: :albums }, null: false
      t.boolean :enabled, default: false, null: false
      t.string :sync_frequency, default: 'manual', null: false
      t.datetime :last_sync_at
      t.integer :last_photo_count, default: 0, null: false
      t.integer :new_photos_since_sync, default: 0, null: false
      t.timestamps
    end

    add_index :album_auto_syncs, :enabled
    add_index :album_auto_syncs, [:device_album_upload_id, :server_album_id], unique: true, name: 'idx_auto_sync_unique'
  end
end
