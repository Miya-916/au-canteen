const fs = require('fs');
const path = require('path');

console.log("CWD:", process.cwd());
const publicDir = path.join(process.cwd(), 'public');
console.log("Public Dir:", publicDir);

if (fs.existsSync(publicDir)) {
  console.log("Public exists");
  const uploadsDir = path.join(publicDir, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    console.log("Uploads exists");
    fs.readdirSync(uploadsDir).forEach(file => {
      console.log(" - " + file);
      const sub = path.join(uploadsDir, file);
      if (fs.statSync(sub).isDirectory()) {
         fs.readdirSync(sub).forEach(f => console.log("   - " + f));
      }
    });
  } else {
    console.log("Uploads does NOT exist");
  }
} else {
  console.log("Public does NOT exist");
}
