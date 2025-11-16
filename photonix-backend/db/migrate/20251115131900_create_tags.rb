class CreateTags < ActiveRecord::Migration[8.1]
  def change
    create_table :tags do |t|
      t.string :name
      t.string :tag_type
      t.string :category
      t.integer :usage_count

      t.timestamps
    end
  end
end
