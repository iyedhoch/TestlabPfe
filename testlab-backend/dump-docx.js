const fs = require('fs');
const JSZip = require('jszip');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node dump-docx.js <path-to-docx>');
  process.exit(1);
}

const zipData = fs.readFileSync(filePath);
JSZip.loadAsync(zipData).then(zip => {
  const doc = zip.file('word/document.xml');
  if (!doc) {
    console.error('word/document.xml not found');
    process.exit(1);
  }
  doc.async('string').then(text => {
    const outPath = filePath.replace(/\.docx$/i, '_document.xml');
    fs.writeFileSync(outPath, text);
    console.log('Saved to', outPath);
    
    // Also search for epics
    const matches = text.match(/[^<]*#epics[^<]*/gi) || [];
    console.log('Matches for #epics:', matches.length);
    matches.slice(0, 5).forEach(m => console.log(m.substring(0, 100)));
  });
}).catch(err => console.error(err));