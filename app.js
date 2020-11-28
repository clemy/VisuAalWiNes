const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

console.log('VisuAalWiNes - Visualization for AaalWiNes');
console.log('  Version 0.3.0');

const modelsPath = path.join(process.cwd(), 'data', 'models');
const binPath = path.join(process.cwd(), 'bin');
const models = require('./backend/models')(modelsPath, binPath, models => {
    io.emit('models', models);
});

app.use(express.static(path.join(__dirname, 'static')));

io.on('connect', (socket) => {    
    socket.on('getModelData', async (name) => {
        try {
            const modelData = await models.loadModel(name);
            socket.emit('modelData', { name: name, data: modelData });
        } catch (err) {
            socket.emit('modelData', { name: name, error: err.toString() });
        }
    });
    socket.on('doQuery', async (model, query, options) => {
        try {
            const queryResult = await models.doQuery(socket, model, query, options);
            socket.emit('queryResult', { model: model, query: query, data: queryResult });
        } catch (err) {
            socket.emit('queryResult', { model: model, query: query, error: err.toString() });
        }
    });
    socket.on('cancelQuery', async () => {
        models.cancelQuery(socket);
    });
    socket.on('uploadModel', async (data) => {
        try {
            const [name, modelData] = await models.uploadModel(data);
            socket.emit('modelDataAfterUpload', { name: name, data: modelData });
        } catch (err) {
            socket.emit('modelDataAfterUpload', { error: err.toString() });
        }
    });

    socket.emit('models', models.models);
});

app.use(function(req, res) {
    res.status(400).sendFile(path.join(__dirname,'static', '404.html'));
});

http.listen(3000, function() {
    console.log();
    console.log('Start your browser and go to http://localhost:3000/');
});
