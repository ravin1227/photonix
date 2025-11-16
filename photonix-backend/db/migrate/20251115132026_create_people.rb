class CreatePeople < ActiveRecord::Migration[8.1]
  def change
    create_table :people do |t|
      t.string :name
      t.integer :cover_face_id
      t.integer :face_count
      t.boolean :user_confirmed

      t.timestamps
    end
  end
end
