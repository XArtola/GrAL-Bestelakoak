import { createWriteStream } from 'fs';
import { defineParameterType, When, Then } from '@cucumber/cucumber'; // Import directly from @cucumber/cucumber

export default {
  import: ['features/**/*.js'],
  publishQuiet: true,
  format: [
    'progress',
    // Use the built-in 'html' formatter
    `html:.cucumber/report.html`, 
    `json:.cucumber/results.json`
  ]
};