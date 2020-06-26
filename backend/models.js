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
                // if array change
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
        let network;
        try {
            network = await fsp.readFile(netFile, 'utf8');
        } catch(e) {
            network = await this.calculateModel(name);
        }
        return await this.augmentModel(name, JSON.parse(network));
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
                { env: { MOPED_PATH: mopedPath }, maxBuffer: 100 * 1024 * 1024 }
            ));
        } catch (err) {
            console.error('loadModel error', name, err);
            throw err.toString();
        }
        //TODO: we need to synchronize file writes (see documentation of fsPromise.writeFile)
        fsp.writeFile(netFile, stdout).catch(reason => {
            console.error("write net.json file error", name, reason);
        });
        return stdout;
    }

    async augmentModel(name, network) {
        network = await this.augmentModelWithLocation(name, network);
        network = await this.augmentModelWithQueries(name, network);
        return network;
    }

    async augmentModelWithLocation(name, network) {
        const locationFile = path.join(this._modelsPath, name, 'location.json');
        let locationFileContent;
        try {
            locationFileContent = await fsp.readFile(locationFile, 'utf8');
        } catch(e) {
            return network;
        }
        const locations = JSON.parse(locationFileContent);
        
        Object.keys(network.routers).forEach(routerName => {
            Object.assign(network.routers[routerName], locations[routerName]);
        });
        return network;
    }

    async augmentModelWithQueries(name, network) {
        const queriesFile = path.join(this._modelsPath, name, 'queries.json');
        let queriesFileContent;
        try {
            queriesFileContent = await fsp.readFile(queriesFile, 'utf8');
        } catch(e) {
            return network;
        }
        const queries = JSON.parse(queriesFileContent);
        network.queries = queries;
        return network;
    }

    async doQuery(socket, model, query, options) {
        const mopedPath = path.join(this._binPath, 'moped');
        const topologyFile = path.join(this._modelsPath, model, 'topo.xml');
        const routingFile = path.join(this._modelsPath, model, 'routing.xml');
        var stdout, stderr;
        await tmp.withFile(async ({ path: tmpQueryFile }) => {
            await fsp.writeFile(tmpQueryFile, query);
            let parameters = ['--topology', topologyFile, '--routing', routingFile, '-e', options.engine, '-r', options.reduction, '-t', '-q', tmpQueryFile];
            await tmp.withFile(async ({ path: tmpWeightFile }) => {
                if (options.weight) {
                    await fsp.writeFile(tmpWeightFile, JSON.stringify(options.weight));
                    parameters = [...parameters, '-w', tmpWeightFile];
                }
                var child = null;
                try {
                    const childPromise = execFile(path.join(this._binPath, 'aalwines'),
                        parameters,
                        { env: { MOPED_PATH: mopedPath }, maxBuffer: 100 * 1024 * 1024 }
                    );
                    child = childPromise.child;
                    socket.runningQueryProcess = child;
                    ({ stdout, stderr } = await childPromise);
                } catch (err) {
                    if (child.killed) {
                        console.error('doQuery error cancelled');
                        throw "Validation cancelled";
                    }
                    console.error('doQuery error', model, err);
                    throw err.stderr ? err.stderr : err.toString();
                } finally {
                    socket.runningQueryProcess = null;
                }
            }, { discardDescriptor: true });
        }, { discardDescriptor: true/*, dir: path.join(this._modelsPath, model)*/ });
        return { ...JSON.parse(stdout), raw: stdout };
    }

    cancelQuery(socket) {
        if (socket.runningQueryProcess) {
            socket.runningQueryProcess.kill();
        }
    }
}

module.exports = function(modelsPath, binPath, cb) {
    return new Models(modelsPath, binPath, cb);
};
