const fs = require('fs'); // File system module

function readFile(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data)); // Parse the file content as JSON
      }
    });
  });
}

/*
function reformatJson(data) {
    const nodes = [];
    const edges = [];
    let nodeId = 0;
  
    for (const url in data) {
      const links = data[url];
  
      nodes.push({
        id: `node_${nodeId}`,
        label: url,
        x: 0, // You can set these coordinates as needed
        y: 0,
        size: 10, // You can set the size as needed
      });
      nodeId++;
  
      for (const link of links) {
        edges.push({
          id: `edge_${nodeId}`,
          source: `node_${nodeId - 1}`,
          target: link.href || "", // Handle missing href
        });
        nodeId++;
      }
    }
  
    return {
      nodes,
      edges,
    };
  }
  */

  function reformatData(data) {
    const nodes = [];
    const edges = [];
    let nodeId = 1;
  
    // Loop through each URL and its links
    for (const url in data) {
      nodes.push({
        id: url, //`node-${nodeId}`,
        x: Math.random() * 100, // Random x position
        y: Math.random() * 100, // Random y position
        label: url,
        size: 10, // Adjust size as needed
      });
      nodeId++;
    }
    for (const url in data) {
      for (const link of data[url].elements) {
        const label = `${link.type} - ${link.text}`;
        const targetNode = nodes.find(node => node.label === link.href);
  
        if (targetNode && link.href !== "") {
            edges.push({
            id: link.href,
            source: url, // Extract node id from URL
            target: targetNode.id,
            label,
            });
        }
      }
    }
  
    return {
      nodes,
      edges,
    };
  }


  // Example usage:
  const originalData = {
    // ... your original JSON data here
  };
  
async function main(fileName) {
    try {
        const originalData = await readFile(fileName);
        const reformattedData = reformatData(originalData);
        const newFileName = fileName.replace('.json', '_reformatted.json');
        fs.writeFile(newFileName, JSON.stringify(reformattedData), 'utf8', (err) => {
            if (err) {
                console.error("Error writing file:", err);
            } else {
                console.log("File reformatted and saved as", newFileName);
            }
        });
    } catch (error) {
        console.error("Error:", error);
    }
}


main('user-interactions.json');

  