/**
 * This is a minimal example of sigma. You can use it as a base to write new
 * examples, or reproducible test cases for new issues, for instance.
 */

import Graph from "graphology";
import Sigma from "sigma";

const container = document.getElementById("sigma-container") as HTMLElement;

const graph = new Graph();

let jsondata: JSON;

fetch("")
    .then(response => response.json())
    .then(data => {
        // Use the data from the JSON file here
        console.log(data);
        jsondata = data;
    }).then(() => {
        jsondata.nodes.forEach((node: any) => {
            graph.addNode(node.id, {
                x: node.x,
                y: node.y,
                size: node.size,
                label: node.label,
                color: "blue"
            });
        });

        jsondata.edges.forEach((edge: any) => {
            graph.addEdge(edge.source, edge.target, {
                label: edge.label
            });
        });
    })
    .catch(error => {
        console.error("Error reading JSON file:", error);
    });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
//const renderer = new Sigma(graph, container);
const renderer = new Sigma(graph, container);

