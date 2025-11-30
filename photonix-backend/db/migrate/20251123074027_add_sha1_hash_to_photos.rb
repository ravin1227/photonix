class AddSha1HashToPhotos < ActiveRecord::Migration[8.1]
  def change
    add_column :photos, :sha1_hash, :string
    add_index :photos, [:user_id, :sha1_hash], name: 'index_photos_on_user_id_and_sha1_hash'
  end
end
