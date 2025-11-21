// MongoDB initialization script
db = db.getSiblingDB('cowrite_ai');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password_hash', 'created_at'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password_hash: {
          bsonType: 'string'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin']
        },
        email_verified: {
          bsonType: 'bool'
        }
      }
    }
  }
});

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'owner_id', 'created_at'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 200
        },
        owner_id: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.projects.createIndex({ owner_id: 1 });
db.files.createIndex({ project_id: 1 });
db.entities.createIndex({ project_id: 1, type: 1 });
db.text_chunks.createIndex({ project_id: 1, file_id: 1 });
db.relationships.createIndex({ project_id: 1 });

print('MongoDB initialization completed');