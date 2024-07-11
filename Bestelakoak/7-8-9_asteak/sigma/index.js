const express = require('express');
const graphology = require('graphology');
const Sigma = require('sigma');
const fs = require('path'); // Added for file path handling
const { exec } = require('child_process');

const app = express();

const crawlScriptPath = fs.join(__dirname, 'crawl.js'); // Path to crawl script
  // You need to manually run the Puppeteer script (crawl.js) to generate user-interactions.json before processing a URL

  async function processURL(url) {
    // Execute the crawl script to generate user-interactions.json
    await new Promise((resolve, reject) => {
      exec('node crawl.js'+url, (error, stdout, stderr) => {
        if (error) {
          console.error('Error running crawl script:', error);
          reject(error);
        } else {
          console.log('Crawl script executed successfully');
          resolve();
        }
      });
    });

    // Read user interaction data from the JSON file
    try {
      const data = fs.readFileSync('user-interactions.json', 'utf8');
      const userInteractions = JSON.parse(data);
      const interactionsForUrl = userInteractions[url]; // Get interactions specific to this URL

      // **Replace this placeholder with your logic to transform user interaction data into a graph structure (nodes & edges)**
      // This will depend on the format of data in userInteractions[url] (e.g., array of objects with type, text, and potentially connections)
      const graphData = {
        // ... Your logic to create nodes and edges based on interaction elements and their relationships
        nodes: [],
        edges: [],
      };

      return graphData;
    } catch (error) {
      console.error('Error reading user-interactions.json:', error);
      return null;
    }
  };

  // Read user interaction data from the JSON file
  try {
    const data = fs.readFileSync('user-interactions.json', 'utf8');
    const userInteractions = JSON.parse(data);
    const interactionsForUrl = userInteractions[url]; // Get interactions specific to this URL

    // **Replace this placeholder with your logic to transform user interaction data into a graph structure (nodes & edges)**
    // This will depend on the format of data in userInteractions[url] (e.g., array of objects with type, text, and potentially connections)
    const graphData = {
      // ... Your logic to create nodes and edges based on interaction elements and their relationships
      nodes: [],
      edges: [],
    };

    return graphData;
  } catch (error) {
    console.error('Error reading user-interactions.json:', error);
    return null;
  }
;

async function createGraph(jsonData) {
  const graph = new graphology();

  // Add nodes and edges based on the structure of jsonData (replace with your logic)
  jsonData.nodes.forEach(node => {
    graph.addNode(node.id, { label: node.label });
  });

  jsonData.edges.forEach(edge => {
    graph.addEdge(edge.source, edge.target);
  });

  return graph;
}

app.post('/', async (req, res) => {
  const url = req.body.url;

  const jsonData = await processURL(url);

  if (!jsonData) {
    return res.send('Error processing URL or run crawl script to generate user-interactions.json');
  }

  const graph = await createGraph(jsonData);

  const container = document.getElementById('graph-container');
  const textField = document.createElement('input');
  textField.type = 'text';
  textField.id = 'url-input';

  const button = document.createElement('button');
  button.textContent = 'Generate Graph';
  button.addEventListener('click', async () => {
    const url = document.getElementById('url-input').value;
    const jsonData = await processURL(url);

    if (!jsonData) {
      return res.send('Error processing URL or run crawl script to generate user-interactions.json');
    }

    const graph = await createGraph(jsonData);

    const sigma = new Sigma(container);
    sigma.graph.clear();
    sigma.graph.read(graph);
    sigma.refresh();

    res.send('Graph generated successfully');
  });

  container.appendChild(textField);
  container.appendChild(button); // Assuming you have this element in your HTML
  const sigma = new Sigma(container);
  sigma.graph.clear();
  sigma.graph.read(graph);
  sigma.refresh();

  res.send('Graph generated successfully');
});

app.listen(3000, () => console.log('Server listening on port 3000'));