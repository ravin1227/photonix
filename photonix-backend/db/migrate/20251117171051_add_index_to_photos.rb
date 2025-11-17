class AddIndexToPhotos < ActiveRecord::Migration[8.1]
  def change
    # Add index on captured_at for efficient sorting by photo capture date
    add_index :photos, :captured_at

    # Add composite index for user_id + captured_at for user-specific queries
    add_index :photos, [:user_id, :captured_at]
  end
end
