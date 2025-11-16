class CreatePhotos < ActiveRecord::Migration[8.1]
  def change
    create_table :photos do |t|
      t.references :user, null: false, foreign_key: true
      t.string :original_filename
      t.string :file_path
      t.bigint :file_size
      t.string :format
      t.integer :width
      t.integer :height
      t.string :checksum
      t.datetime :captured_at
      t.string :camera_make
      t.string :camera_model
      t.integer :iso
      t.decimal :aperture
      t.string :shutter_speed
      t.integer :focal_length
      t.decimal :latitude
      t.decimal :longitude
      t.decimal :altitude
      t.string :processing_status
      t.datetime :deleted_at

      t.timestamps
    end
  end
end
