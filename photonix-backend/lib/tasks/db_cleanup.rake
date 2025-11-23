namespace :db do
  desc "Clean all photos and related data, keep user data"
  task clean_photos: :environment do
    puts "🧹 Starting database cleanup..."
    puts "⚠️  This will delete ALL photos, faces, people, albums, tags, and related data"
    puts "✅ User accounts and login_tokens will be preserved"
    puts ""
    
    # Count before deletion
    photo_count = Photo.count
    face_count = Face.count
    person_count = Person.count
    album_count = Album.count
    tag_count = Tag.count
    photo_album_count = PhotoAlbum.count
    photo_tag_count = PhotoTag.count
    album_user_count = AlbumUser.count
    
    puts "📊 Current data counts:"
    puts "   Photos: #{photo_count}"
    puts "   Faces: #{face_count}"
    puts "   People: #{person_count}"
    puts "   Albums: #{album_count}"
    puts "   Tags: #{tag_count}"
    puts "   Photo-Album links: #{photo_album_count}"
    puts "   Photo-Tag links: #{photo_tag_count}"
    puts "   Album-User links: #{album_user_count}"
    puts ""
    
    # Delete in correct order (respecting foreign keys)
    puts "🗑️  Deleting data..."
    
    # Delete photo-related data first
    PhotoTag.delete_all
    puts "   ✓ Deleted PhotoTags"
    
    PhotoAlbum.delete_all
    puts "   ✓ Deleted PhotoAlbums"
    
    Face.delete_all
    puts "   ✓ Deleted Faces"
    
    # Delete photos (this will also delete associated files if callbacks are set up)
    Photo.delete_all
    puts "   ✓ Deleted Photos"
    
    # Delete albums and related data
    AlbumUser.delete_all
    puts "   ✓ Deleted AlbumUsers"
    
    Album.delete_all
    puts "   ✓ Deleted Albums"
    
    # Delete people and tags
    Person.delete_all
    puts "   ✓ Deleted People"
    
    Tag.delete_all
    puts "   ✓ Deleted Tags"
    
    puts ""
    puts "✅ Database cleanup complete!"
    puts ""
    puts "📊 Remaining data:"
    puts "   Users: #{User.count}"
    puts "   Login Tokens: #{LoginToken.count}"
    puts ""
    puts "💡 Note: Physical photo files may still exist in storage."
    puts "   You may want to clean up the storage directory manually."
  end
  
  desc "Clean expired login tokens"
  task clean_expired_tokens: :environment do
    expired_count = LoginToken.expired.count
    puts "🧹 Cleaning expired login tokens..."
    LoginToken.expired.delete_all
    puts "✅ Deleted #{expired_count} expired login tokens"
  end
end

