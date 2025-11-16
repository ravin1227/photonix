class AddEnhancedAlbumsAndRoles < ActiveRecord::Migration[8.1]
  def change
    # Add role to users for admin/user distinction
    add_column :users, :role, :string, default: 'user', null: false
    add_index :users, :role

    # Enhance albums for sharing
    add_reference :albums, :created_by, foreign_key: { to_table: :users }
    add_column :albums, :is_shared, :boolean, default: false, null: false

    # Create album_users for sharing albums with permissions
    create_table :album_users do |t|
      t.references :album, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.boolean :can_view, default: true, null: false
      t.boolean :can_contribute, default: false, null: false
      t.boolean :is_owner, default: false, null: false
      t.timestamps
    end
    add_index :album_users, [:album_id, :user_id], unique: true

    # Create login tokens for QR code login
    create_table :login_tokens do |t|
      t.string :token, null: false, index: { unique: true }
      t.references :user, null: false, foreign_key: true
      t.datetime :expires_at, null: false
      t.boolean :used, default: false
      t.timestamps
    end
    add_index :login_tokens, :expires_at
  end
end
