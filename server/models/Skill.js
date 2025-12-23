const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  level: { type: String, required: true }, // beginner, intermediate, etc.
  category: { type: String, required: true }, // technical, soft, etc.
  lastUsed: { type: String }, // YYYY-MM
  proofs: [{
    type: { type: String }, // certificate, github, etc.
    text: { type: String },
    url: { type: String }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Skill', skillSchema);