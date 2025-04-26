const { exec } = require('child_process');
function mirrorWebsite(url, outputDir, depth = 2) {
    return new Promise((resolve, reject) => {
        const command = `httrack "${url}" -O "${outputDir}" -r${depth}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject(error); return;
            } console.log(`stdout: ${stdout}`); console.error(`stderr: ${stderr}`);
            resolve(stdout);
        });
    });
}
// Example usage mirrorWebsite('http://example.com', '/path/to/save/directory', 3) .then(() =>
//console.log('Website mirroring completed')) .catch((error) => console.error('An error occurred:', error));




