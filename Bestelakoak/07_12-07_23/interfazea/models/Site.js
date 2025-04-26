import { Schema, model, models } from 'mongoose';

const SiteSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
    },
    url: {
        type: String,
        required: [true, 'URL is required'],
        trim: true,
    },
    // Hemen sitemap eta test-entzat model bat egitea komeniko da?
    sitemap: {
        type: Object,
        required: [true, 'Sitemap is required'],
    },
    tests: {
        type: Object,
        required: [true, 'Tests are required'],
    },
}, {
    timestamps: true,
})

export default models.Site || model('Site', SiteSchema);
