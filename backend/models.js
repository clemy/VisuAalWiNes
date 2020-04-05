const fs = require('fs');
const fsp = fs.promises;
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const path = require('path');
const tmp = require('tmp-promise');

class Models {
    constructor(modelsPath, binPath, cb) {
        this._modelsPath = modelsPath;
        this._binPath = binPath;
        this._cb = cb;
        this._models = [];
        const onChange = async () => {
            try {
                var items = await fsp.readdir(this._modelsPath, { withFileTypes: true });
            } catch (err) {
                console.error('Error during readdir', err);
                var items = [];
            }
            const models = items.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
            if (models.length !== this._models.length || models.some((value, index) => value !== this._models[index])) {
                // if array changed
                this._models = models;
                this._cb(this._models);
            }
        };
        fs.watch(this._modelsPath, { persistent: false }, onChange);
        onChange();
    }

    get models() {
        return this._models;
    }
    async loadModel(name) {
        const netFile = path.join(this._modelsPath, name, 'net.json');
        try {
            var netFileContent = await fsp.readFile(netFile, 'utf8');
        } catch(e) {
            return this.calculateModel(name);
        }
        return JSON.parse(netFileContent);
    }

    async calculateModel(name) {
        const mopedPath = path.join(this._binPath, 'moped');
        const topologyFile = path.join(this._modelsPath, name, 'topo.xml');
        const routingFile = path.join(this._modelsPath, name, 'routing.xml');
        const netFile = path.join(this._modelsPath, name, 'net.json');
        var stdout, stderr;
        try {
            ({ stdout, stderr } = await execFile(path.join(this._binPath, 'aalwines'),
                ['--topology', topologyFile, '--routing', routingFile, '--net'],
                { env: { MOPED_PATH: mopedPath }}
            ));
        } catch (err) {
            console.error('loadModel error', name, err);
            throw err.toString();
        }
        //TODO: we need to synchronize file writes (see documentation of fsPromise.writeFile)
        fsp.writeFile(netFile, stdout).catch(reason => {
            console.error("write net.json file error", name, reason);
        });
        return JSON.parse(stdout);
    }

    async doQuery(model, query, options) {
        const mopedPath = path.join(this._binPath, 'moped');
        const topologyFile = path.join(this._modelsPath, model, 'topo.xml');
        const routingFile = path.join(this._modelsPath, model, 'routing.xml');
        var stdout, stderr;
        await tmp.withFile(async ({ path: tmpQueryFile }) => {
            await fsp.writeFile(tmpQueryFile, query);
            try {
                ({ stdout, stderr } = await execFile(path.join(this._binPath, 'aalwines'),
                    ['--topology', topologyFile, '--routing', routingFile, '-e', options.engine, '-t', '-q', tmpQueryFile],
                    { env: { MOPED_PATH: mopedPath }}
                ));
            } catch (err) {
                console.error('loadModel error', model, err);
                throw err.toString();
            }
        }, { discardDescriptor: true/*, dir: path.join(this._modelsPath, model)*/ });
        return JSON.parse(stdout);
    }
}

module.exports = function(modelsPath, binPath, cb) {
    return new Models(modelsPath, binPath, cb);
};
