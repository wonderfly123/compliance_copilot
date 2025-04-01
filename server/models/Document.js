const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Please specify the document type'],
    enum: ['EOP', 'HMP', 'COOP', 'IAP', 'AAR', 'Other']
  },
  status: {
    type: String,
    enum: ['Draft', 'In Review', 'Final', 'Needs Review'],
    default: 'Draft'
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  complianceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  criticalSections: {
    type: Number,
    default: 0
  },
  expirationDate: {
    type: Date
  },
  fileUrl: {
    type: String
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
