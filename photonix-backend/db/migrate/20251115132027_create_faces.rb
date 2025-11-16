class CreateFaces < ActiveRecord::Migration[8.1]
  def change
    create_table :faces do |t|
      t.references :photo, null: false, foreign_key: true
      t.references :person, null: false, foreign_key: true
      t.float :bbox_x
      t.float :bbox_y
      t.float :bbox_width
      t.float :bbox_height
      t.float :quality_score
      t.float :confidence

      t.timestamps
    end
  end
end
