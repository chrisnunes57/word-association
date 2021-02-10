class Node {
    /**
    * @param value: The text to be contained in the node
    * @param edges: A list of references to other nodes
    */
    constructor(value, edges=[]) {
        this.value = value;
        this.placeholder = this.getPlaceholder(value);
        this.edges = edges;

        // other attributes
        this.found = false;
        this.parent = false;
        this.visible = false;
        this.htmlText = null;
        this.visualLinks = [];
        this.center = {"x": 0, "y": 0}
    }

    /**
    * @param otherNode: a reference to the new node we are connecting to
    */
    addConnection(otherNode) {
        this.edges.push(otherNode);
    }

    /**
    * @param value: The text that we are building a placeholder for
    */
    getPlaceholder(value) {
        let result = "";
        for (let i = 0; i < value.length; i++) {
            if (value[i] === " ") {
                result += " ";
            } else {
                result += "●";
            }
        }

        return result;
    }
    /**
    * No params
    */
    entryString() {
        return this.edges.join(", ");
    }
    /**
    * No params
    */
    text() {
        return this.found ? this.value : this.placeholder;
    }
}

class NodeMap {
    constructor() {
        this.nodes = new Map();
    }

    /**
    * @param node: The node that we are adding to the map
    */
    add(node) {
        this.nodes.set(node.value.toLowerCase(), node);
    }

    /**
    * @param text: The text of the node that we want to get 
    */
    get(text) {
        return this.nodes.get(text.toLowerCase());
    }

    /**
    * @param node: The text of the node that we want to check for
    */
    has(text) {
        return this.nodes.has(text.toLowerCase());
    }

}

// CONSTANTS & GLOBALS
// document references and things like that
const guessInput = document.getElementById("guessInput");
const gameWrapper = document.getElementById("gameWrapper");
const gameSvg = document.getElementById("gameSvg");
const displayPanel = document.getElementById("displayPanel");
const transformLayer = document.getElementById("transformLayer");

const SVG_WIDTH = window.innerWidth;
const SVG_HEIGHT = window.innerHeight;
const CIRCLE_RADIUS = 15;

// this will store any node that is currently clicked/selected
let currentNode = null;

// this will store all strings, with references to their respective nodes
const nodeMap = new NodeMap();

// get our transform layer ready for dragging and scaling
transformLayer.x = 0;
transformLayer.y = 0;
transformLayer.scale = 1;

// LISTENERS
// setting up document listeners here
guessInput.onkeypress = (e) => {
    if (e.keyCode === 13) {
        submitGuess(guessInput.value.trim());
        guessInput.value = "";
    }
}

function onNodeClick(text) {
    if (currentNode !== null) {
        // we have an existing selected node we need to get rid of
        deselectNode(currentNode);
    }
    currentNode = nodeMap.get(text);
    selectNode(currentNode);
}

transformLayer.onmousedown = (e) => {
    transformLayer.xOffset = e.clientX - transformLayer.x;
    transformLayer.yOffset = e.clientY - transformLayer.y;
    transformLayer.onmousemove = handleScreenDrag;
}

transformLayer.onmouseup = (e) => {
    transformLayer.onmousemove = null;
}

transformLayer.onwheel = (e) => {
    e.preventDefault();
    transformLayer.scale += e.deltaY * -0.001;
    transformLayer.x += e.deltaY;
    transformLayer.y += e.deltaY;
    // Restrict scale
    transformLayer.scale = Math.min(Math.max(.3, transformLayer.scale), 2);

    // Apply scale transform
    transformLayer.setAttribute("transform", `translate(${transformLayer.x},${transformLayer.y}) scale(${transformLayer.scale})`);
}

// FUNCTIONS
// helper methods!

function handleScreenDrag(e) {
    transformLayer.x = e.clientX - transformLayer.xOffset;
    transformLayer.y = e.clientY - transformLayer.yOffset;

    transformLayer.setAttribute("transform", `translate(${transformLayer.x},${transformLayer.y}) scale(${transformLayer.scale})`);
}

// un-highlight links and clear the display pane
function deselectNode(node) {

    while (displayPanel.firstChild) {
        displayPanel.removeChild(displayPanel.firstChild);
    }

    // only continue if we have a node
    if (node === null) return;

    node.visualLinks.forEach((link) => {
        link.setAttribute("class", "link");
    });
}

// highlight links and update the display pane
function selectNode(node) {    
    if (node === null) return;
    // update display panel title
    let title = document.createElement("p");
    title.innerText = node.text();
    title.className = "title";
    displayPanel.appendChild(title);

    // update display panel subitems
    node.edges.forEach( (edge) => {
        if (edge.visible) {
            let subitem = document.createElement("p");
            subitem.innerText = edge.text();
            displayPanel.appendChild(subitem);

            // when clicked, they should focus the next thing
            subitem.onclick = (e) => {
                deselectNode(currentNode);
                selectNode(edge);
            }
        }
    });

    // highlight links
    node.visualLinks.forEach((link) => {
        link.setAttribute("class", "link active");
    });
}

function submitGuess(guess) {
    if (nodeMap.has(guess)) {
        // we reveal the node and add its children to the gui
        const guessedNode = nodeMap.get(guess);
        guessedNode.found = true;
        guessedNode.htmlText.innerHTML = guessedNode.value;
        guessedNode.edges.forEach( (edge) => {
            if (!edge.visible) {
                addNodeToGui(edge);
                addConnectionToGui(guessedNode, edge);
            }
        });

        //update display panel
        deselectNode(currentNode);
        selectNode(currentNode);
    } else {
        console.log("guess is bad")
    }
}

// creates and returns node, plus handles the overhead of adding to nodeMap
function createNode(text, parent=false, edges=[]) {
    const n = new Node(text);
    n.parent = parent;
    n.found = n.parent;
    n.visible = n.parent;

    nodeMap.add(n);
    return n;
}

// gets node from nodemap

// creates a connection between two nodes
function createConnection(node1, node2) {
    // create the data structure connnection
    node1.addConnection(node2);
    node2.addConnection(node1);
}

// draws a visual connection between two nodes
function addConnectionToGui(node1, node2) {
    // creates a visual connection between two nodes in the GUI
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "link");
    line.setAttribute("x1", node1.center.x);
    line.setAttribute("y1", node1.center.y);
    line.setAttribute("x2", node2.center.x);
    line.setAttribute("y2", node2.center.y);

    // add link to gui and store it in each node
    transformLayer.prepend(line);
    node1.visualLinks.push(line);
    node2.visualLinks.push(line);
}

// populates the graph with nodes
function populateGraph() {
    // generate one main node
    const mainNode = createNode("Pixar Animations", true);

    // generate another main node
    const elizabethNode = createNode("Elizabeth", true)

    // add children of elizabeth node
    const elizabethChildren = ["Elizabeth Warren", "Lana Del Rey", "Queen Elizabeth", "Elizabeth Swann", "Beth Harmon"];
    elizabethChildren.forEach((child) => {
        const n = createNode(child);
        createConnection(n, elizabethNode);
    });

    // add children of main node
    const children = ["Bao", "Coco", "Finding Nemo", "Inside Out", "The Blue Umbrella"];
    children.forEach((child) => {
        const n = createNode(child);
        createConnection(n, mainNode);
    });

    // add some children of the 'Coco' node
    const cocoChildren = ["Cocoa", "Chanel"];
    const c = nodeMap.get("Coco");
    cocoChildren.forEach((child) => {
        const n = createNode(child);
        createConnection(n, c);
    });

    // add some children of the 'Bao' node
    const baoChildren = ["Boardgames", "Bow"];
    const b = nodeMap.get("bao");
    baoChildren.forEach((child) => {
        const n = createNode(child);
        createConnection(n, b);
    });

    // add some children of the 'Bao' node
    const umbrellaChildren = ["Umbrella", "Blue"];
    const u = nodeMap.get("the blue umbrella");
    umbrellaChildren.forEach((child) => {
        const n = createNode(child);
        createConnection(n, u);
    });
}

// compares the provided x,y coordinates to the graph to see if the space is occupied
function spaceTaken(x, y, name="") {
    nodeMap.nodes.forEach((node) => {
        if (node.visible && node.value !== name) {
            // calculate distance between points
            let a = x - node.center.x;
            let b = y - node.center.y;
            let dist = Math.sqrt(a * a + b * b);

            radius = Math.max(node.width, node.height) + 20; //additional buffer of 20

            if (dist < radius) {
                return true;
            }
        }
    })

    return false;
    
}

// adds new node to the game
function addNodeToGui(node) {

    // add new canvas circle to game
    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", node.parent ? "node parent" : "node");

    let x = 75 + Math.random() * (SVG_WIDTH - 150);
    let y = 75 + Math.random() * (SVG_HEIGHT - 150);

    while (spaceTaken(x, y, node.value)) {
        x = 75 + Math.random() * (SVG_WIDTH - 150);
        y = 75 + Math.random() * (SVG_HEIGHT - 150);
    }

    g.setAttribute("transform", `translate(${x}, ${y})`);

    // add sub-components to new svg element
    let title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.innerHTML = node.text();

    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", CIRCLE_RADIUS);

    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.innerHTML = node.text();
    text.setAttribute("dy", "0.3em");
    

    g.appendChild(title);
    g.append(circle);
    g.append(text);
    transformLayer.append(g)

    // set up listener for node clicks
    g.onclick = (e) => {
        e.preventDefault();
        onNodeClick(node.value);
    }

    let dimensions = g.getBoundingClientRect();

    // update node properties
    node.visible = true;
    node.htmlText = text;
    node.width = dimensions.width;
    node.height = dimensions.height;
    node.center = {
        "x": x,
        "y": y
    }
}

function setup() {

    gameSvg.setAttribute("width", SVG_WIDTH);
    gameSvg.setAttribute("height", SVG_HEIGHT);
    
    populateGraph();

    // do an initial draw of our parent nodes and their edges
    nodeMap.nodes.forEach( (node, key, map) => {
        if (node.parent) {
            // add node and children
            addNodeToGui(node);
            node.edges.forEach( (edge) => {
                addNodeToGui(edge);
                // connect node and child
                addConnectionToGui(node, edge);
            });
        }
    })
}

// BEGIN
// entry point to the program
setup();