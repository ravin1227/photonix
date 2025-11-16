class AddThumbnailPathToFaces < ActiveRecord::Migration[8.1]
  def change
    add_column :faces, :thumbnail_path, :string
  end
end
