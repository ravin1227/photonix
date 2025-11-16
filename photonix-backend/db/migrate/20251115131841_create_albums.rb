class CreateAlbums < ActiveRecord::Migration[8.1]
  def change
    create_table :albums do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name
      t.text :description
      t.integer :cover_photo_id
      t.string :privacy
      t.string :album_type

      t.timestamps
    end
  end
end
