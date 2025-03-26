import express from 'express';
import { Project } from 'ts-morph';
import path from 'path';

const app = express();
const port = 3000;

/**
 * Функция определяет, нужно ли исключить зависимость по модулю.
 * Здесь используются как точные совпадения, так и проверка вхождения подстрок.
 */
function isExcludedModule(moduleSpecifier: string): boolean {
    const exactExcludes = ['@angular/core', '@angular/common', 'rxjs'];
    const keywordExcludes = ['ng-zorro', 'Router', 'withInterceptorsFromDi'];

    if (exactExcludes.includes(moduleSpecifier)) {
        return true;
    }
    return keywordExcludes.some(
        (keyword) => moduleSpecifier.indexOf(keyword) !== -1
    );
}

/**
 * Анализ Angular-проекта.
 * @param projectPath - Путь к корню проекта, где находится tsconfig.json
 */
function analyzeProject(projectPath: string) {
    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

    const sourceFiles = project.getSourceFiles();
    // Словарь узлов для подсчёта fan_in и fan_out
    const nodesMap: {
        [id: string]: { id: string; label: string; type: string; metrics: any };
    } = {};
    let edges: { from: string; to: string }[] = [];

    // Функция для добавления узла, если его ещё нет
    const addNode = (id: string, label: string, type: string, metrics: any) => {
        if (!nodesMap[id]) {
            nodesMap[id] = { id, label, type, metrics };
        }
    };

    // Обход исходных файлов
    sourceFiles.forEach((sourceFile) => {
        const classes = sourceFile.getClasses();
        classes.forEach((cls) => {
            const decorators = cls.getDecorators();
            decorators.forEach((decorator) => {
                const decoratorName = decorator.getName();
                if (
                    decoratorName === 'Component' ||
                    decoratorName === 'NgModule'
                ) {
                    const className = cls.getName();
                    if (!className) return;

                    // Простейшая метрика: количество методов в классе
                    const methods = cls.getMethods();
                    const complexity = methods.length;
                    addNode(
                        className,
                        `${className}`,
                        decoratorName === 'Component' ? 'Component' : 'Module',
                        { complexity, fan_in: 0, fan_out: 0, instability: 0 }
                    );

                    // Анализ импортов для поиска зависимостей
                    const importDeclarations =
                        sourceFile.getImportDeclarations();
                    importDeclarations.forEach((importDecl) => {
                        const moduleSpecifier =
                            importDecl.getModuleSpecifierValue();
                        if (isExcludedModule(moduleSpecifier)) return;

                        const namedImports = importDecl.getNamedImports();
                        namedImports.forEach((namedImport) => {
                            const importedName = namedImport.getName();
                            addNode(importedName, importedName, 'External', {
                                complexity: 0,
                                fan_in: 0,
                                fan_out: 0,
                                instability: 0,
                            });
                            edges.push({ from: className, to: importedName });
                        });
                    });
                }
            });
        });
    });

    // Подсчет fan_in и fan_out для каждого узла
    Object.values(nodesMap).forEach((node) => {
        edges.forEach((edge) => {
            if (edge.from === node.id) {
                node.metrics.fan_out++;
            }
            if (edge.to === node.id) {
                node.metrics.fan_in++;
            }
        });
        const { fan_in, fan_out } = node.metrics;
        node.metrics.instability =
            fan_in + fan_out > 0 ? fan_out / (fan_in + fan_out) : 0;
    });

    const nodes = Object.values(nodesMap);
    return { nodes, edges };
}

// Маршрут для анализа проекта.
app.get('/analyze', (req, res) => {
    const projectPath = req.query.projectPath as string;
    if (!projectPath) {
        return res
            .status(400)
            .json({ error: 'Параметр projectPath обязателен' });
    }
    try {
        const graphData = analyzeProject(projectPath);
        res.json(graphData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error!.toString() });
    }
});

// Раздача статических файлов (frontend)
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
