#!/usr/bin/env ruby
# Test script for bulk photo upload
# Usage: ruby test_bulk_upload.rb /path/to/image1.jpg /path/to/image2.jpg /path/to/image3.jpg

require 'net/http'
require 'uri'
require 'json'

# Configuration
API_URL = 'http://localhost:3000/api/v1/photos'
# Get your token from Bruno or generate one
TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3NjMzNTkzNjR9.ZUtzlskiTKWMQnahgG7XhD1ZtJnG8Nnjtg0ILm-dTsY'

if ARGV.empty?
  puts "Usage: ruby test_bulk_upload.rb /path/to/image1.jpg /path/to/image2.jpg ..."
  exit 1
end

# Check all files exist
ARGV.each do |file_path|
  unless File.exist?(file_path)
    puts "Error: File not found: #{file_path}"
    exit 1
  end
end

puts "Testing bulk upload with #{ARGV.length} images..."
puts "Files: #{ARGV.join(', ')}"
puts ""

# Create multipart form data
uri = URI.parse(API_URL)
request = Net::HTTP::Post.new(uri)
request['Authorization'] = "Bearer #{TOKEN}"

# Create multipart form
require 'net/http/post/multipart'
form_data = ARGV.map do |file_path|
  ['photos[]', File.open(file_path)]
end

# Use curl instead (easier)
curl_command = "curl -X POST '#{API_URL}' \\\n"
curl_command += "  -H 'Authorization: Bearer #{TOKEN}' \\\n"
ARGV.each do |file_path|
  curl_command += "  -F 'photos[]=@#{file_path}' \\\n"
end
curl_command = curl_command.chomp(" \\\n")

puts "Executing curl command..."
puts curl_command
puts ""

system(curl_command)
