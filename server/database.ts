import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ieee_documents';

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Document Schema
const authorSchema = new mongoose.Schema({
  id: String,
  name: String,
  department: String,
  organization: String,
  city: String,
  state: String,
  email: String,
  customFields: [{
    id: String,
    name: String,
    value: String
  }]
});

const contentBlockSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ['text', 'image'] },
  content: String,
  imageId: String,
  caption: String,
  size: { type: String, enum: ['very-small', 'small', 'medium', 'large'] },
  position: { type: String, enum: ['top', 'bottom', 'here'] },
  order: Number
});

const subsectionSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  order: Number
});

const sectionSchema = new mongoose.Schema({
  id: String,
  title: String,
  contentBlocks: [contentBlockSchema],
  subsections: [subsectionSchema],
  order: Number
});

const referenceSchema = new mongoose.Schema({
  id: String,
  text: String,
  order: Number
});

const figureSchema = new mongoose.Schema({
  id: String,
  fileName: String,
  originalName: String,
  caption: String,
  size: { type: String, enum: ['very-small', 'small', 'medium', 'large'] },
  position: { type: String, enum: ['top', 'bottom', 'here'] },
  sectionId: String,
  order: Number,
  mimeType: String,
  data: String // base64 encoded
});

const documentSettingsSchema = new mongoose.Schema({
  fontSize: String,
  columns: String,
  exportFormat: { type: String, enum: ['docx', 'latex'] },
  includePageNumbers: Boolean,
  includeCopyright: Boolean
});

const documentSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  abstract: String,
  keywords: String,
  authors: [authorSchema],
  sections: [sectionSchema],
  references: [referenceSchema],
  figures: [figureSchema],
  settings: documentSettingsSchema
}, {
  timestamps: true
});

export const DocumentModel = mongoose.model('Document', documentSchema);