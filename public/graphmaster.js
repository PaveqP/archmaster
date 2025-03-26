let cy;
function renderGraph(data) {
    const elements = [];

    data.nodes.forEach((node) => {
        elements.push({
            data: {
                id: node.id,
                label: node.label,
                type: node.type,
                complexity: node.metrics.complexity,
                fan_in: node.metrics.fan_in,
                fan_out: node.metrics.fan_out,
                instability: node.metrics.instability.toFixed(2),
            },
        });
    });
    data.edges.forEach((edge) => {
        elements.push({
            data: {
                id: `${edge.from}_${edge.to}`,
                source: edge.from,
                target: edge.to,
            },
        });
    });

    if (cy) {
        cy.destroy();
    }

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    shape: 'rectangle',
                    label: 'data(label)',
                    'text-valign': 'center',
                    color: '#fff',
                    'background-color': '#0074D9',
                    width: 'label',
                    height: 'label',
                    padding: '10px',
                    'font-size': '12px',
                    'border-width': 2,
                    'border-color': '#0074D9',
                },
            },
            {
                selector: 'edge',
                style: {
                    width: 2,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                },
            },
            {
                selector: '.selected',
                style: {
                    'border-color': 'yellow',
                    'border-width': 4,
                },
            },
            {
                selector: '.neighbor',
                style: {
                    'background-color': '#FF4136',
                },
            },
            {
                selector: '.edge-neighbor',
                style: {
                    'line-color': '#FF851B',
                    width: 4,
                },
            },
        ],
        layout: {
            name: 'dagre',
            rankDir: 'TB',
            ranker: 'longest-path',
            nodeSep: 50,
            rankSep: 150,
            padding: 20,
            animate: true,
        },
    });

    cy.on('tap', 'node', function (evt) {
        cy.elements().removeClass('selected neighbor edge-neighbor');

        const node = evt.target;
        node.addClass('selected');

        let neighbors = node.neighborhood();
        neighbors
            .nodes()
            .difference(node)
            .forEach((n) => {
                n.addClass('neighbor');
            });
        neighbors.edges().forEach((edge) => {
            edge.addClass('edge-neighbor');
        });

        let nodeData = node.data();
        let neighborLabels = neighbors
            .nodes()
            .difference(node)
            .map((n) => n.data('label'));
        let neighborList =
            neighborLabels.length > 0
                ? neighborLabels.join(', ')
                : 'Отсутствуют';
        document.getElementById('nodeInfo').innerHTML = `
          <strong>ID:</strong> ${nodeData.id}<br>
          <strong>Название:</strong> ${nodeData.label}<br>
          <strong>Тип:</strong> ${nodeData.type}<br>
          <strong>Метрика сложности:</strong> ${nodeData.complexity}<br>
          <strong>fan_in:</strong> ${nodeData.fan_in}<br>
          <strong>fan_out:</strong> ${nodeData.fan_out}<br>
          <strong>I (неустойчивость):</strong> ${nodeData.instability}<br>
          <strong>Соседи:</strong> ${neighborList}
        `;
        document.getElementById('sidebar').style.display = 'block';

        cy.animate({
            center: { eles: node },
            duration: 500,
        });
    });

    cy.on('tap', function (evt) {
        if (evt.target === cy) {
            cy.elements().removeClass('selected neighbor edge-neighbor');
            document.getElementById('sidebar').style.display = 'none';
        }
    });
}

function searchNode(query) {
    if (!cy) return;
    const matchingNodes = cy
        .nodes()
        .filter((node) =>
            node.data('label').toLowerCase().includes(query.toLowerCase())
        );
    if (matchingNodes.length === 0) {
        alert('Узел не найден');
        return;
    }
    const node = matchingNodes[0];
    cy.elements().removeClass('selected neighbor edge-neighbor');
    node.addClass('selected');
    let neighbors = node.neighborhood();
    neighbors
        .nodes()
        .difference(node)
        .forEach((n) => {
            n.addClass('neighbor');
        });
    neighbors.edges().forEach((edge) => {
        edge.addClass('edge-neighbor');
    });
    cy.animate({
        center: { eles: node },
        duration: 500,
    });
    let nodeData = node.data();
    let neighborLabels = neighbors
        .nodes()
        .difference(node)
        .map((n) => n.data('label'));
    let neighborList =
        neighborLabels.length > 0 ? neighborLabels.join(', ') : 'Отсутствуют';
    document.getElementById('nodeInfo').innerHTML = `
          <strong>ID:</strong> ${nodeData.id}<br>
          <strong>Название:</strong> ${nodeData.label}<br>
          <strong>Тип:</strong> ${nodeData.type}<br>
          <strong>Метрика сложности:</strong> ${nodeData.complexity}<br>
          <strong>fan_in:</strong> ${nodeData.fan_in}<br>
          <strong>fan_out:</strong> ${nodeData.fan_out}<br>
          <strong>I (неустойчивость):</strong> ${nodeData.instability}<br>
          <strong>Соседи:</strong> ${neighborList}
      `;
    document.getElementById('sidebar').style.display = 'block';
}

document.getElementById('analyzeBtn').addEventListener('click', function () {
    const projectPath = document.getElementById('projectPath').value;
    if (!projectPath) {
        alert('Введите путь к проекту');
        return;
    }

    fetch(`/analyze?projectPath=${encodeURIComponent(projectPath)}`)
        .then((response) => response.json())
        .then((data) => {
            renderGraph(data);
        })
        .catch((error) => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при анализе проекта');
        });
});
document.getElementById('searchBtn').addEventListener('click', function () {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert('Введите название узла для поиска');
        return;
    }
    searchNode(query);
});
