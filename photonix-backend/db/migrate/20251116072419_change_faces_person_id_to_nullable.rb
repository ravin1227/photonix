class ChangeFacesPersonIdToNullable < ActiveRecord::Migration[8.1]
  def change
    change_column_null :faces, :person_id, true
  end
end
