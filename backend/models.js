const fs = require('fs');
const fsp = fs.promises;
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const path = require('path');
const tmp = require('tmp-promise');

class Models {
    #modelsPath;
    #binPath;
    #models = [];
    #cb;

    constructor(modelsPath, binPath, cb) {
        this.#modelsPath = modelsPath;
        this.#binPath = binPath;
        this.#cb = cb;
        const onChange = async () => {
            try {
                var items = await fsp.readdir(this.#modelsPath, { withFileTypes: true });
            } catch (err) {
                console.error('Error during readdir', err);
                var items = [];
            }
            const models = items.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
            if (models.length !== this.#models.length || models.some((value, index) => value !== this.#models[index])) {
                // if array changed
                this.#models = models;
                this.#cb(this.#models);
            }
        };
        fs.watch(this.#modelsPath, { persistent: false }, onChange);
        onChange();
    }

    get models() {
        return this.#models;
    }

    async loadModel(name) {
        const mopedPath = path.join(this.#binPath, 'moped');
        const topologyFile = path.join(this.#modelsPath, name, 'topo.xml');
        const routingFile = path.join(this.#modelsPath, name, 'routing.xml');
        var stdout, stderr;
        try {
            ({ stdout, stderr } = await execFile(path.join(this.#binPath, 'aalwines'),
                ['--topology', topologyFile, '--routing', routingFile, '--net'],
                { env: { MOPED_PATH: mopedPath }}
            ));
        } catch (err) {
            console.error('loadModel error', name, err);
            throw err.toString();
        }
        return JSON.parse(stdout);
    }

    async doQuery(model, query, options) {
        const mopedPath = path.join(this.#binPath, 'moped');
        const topologyFile = path.join(this.#modelsPath, model, 'topo.xml');
        const routingFile = path.join(this.#modelsPath, model, 'routing.xml');
        var stdout, stderr;
        await tmp.withFile(async ({ path: tmpQueryFile }) => {
            await fsp.writeFile(tmpQueryFile, query);
            try {
                ({ stdout, stderr } = await execFile(path.join(this.#binPath, 'aalwines'),
                    ['--topology', topologyFile, '--routing', routingFile, '-e', options.engine, '-t', '-q', tmpQueryFile],
                    { env: { MOPED_PATH: mopedPath }}
                ));
            } catch (err) {
                console.error('loadModel error', model, err);
                throw err.toString();
            }
        }, { discardDescriptor: true/*, dir: path.join(this.#modelsPath, model)*/ });
        return JSON.parse(stdout);
    }
}

module.exports = function(modelsPath, binPath, cb) {
    return new Models(modelsPath, binPath, cb);
};
