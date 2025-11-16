class AddFaceEncodingToFaces < ActiveRecord::Migration[8.1]
  def change
    add_column :faces, :face_encoding, :text
  end
end
