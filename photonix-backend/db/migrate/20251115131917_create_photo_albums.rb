class CreatePhotoAlbums < ActiveRecord::Migration[8.1]
  def change
    create_table :photo_albums do |t|
      t.references :photo, null: false, foreign_key: true
      t.references :album, null: false, foreign_key: true
      t.integer :position

      t.timestamps
    end
  end
end
