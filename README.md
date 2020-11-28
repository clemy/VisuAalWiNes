# VisuAalWiNes

## A visualization frontend for the AalWiNes tool
This project is based on code from the VisuAAL project (github:petergjoel/VisuAAL) by Peter G. Jensen.

## Quick Start
Download a binary delivery under https://github.com/clemy/VisuAalWiNes/releases

## Requirements
Necessary if you do not use the binary delivery:

###  Node.js v13 
<https://nodejs.org/>

Install as Ubuntu package:
```bash
# setup apt repositories
curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
# install nodejs package
sudo apt-get install -y nodejs
# install build-essential for some npm packages
sudo apt-get install -y build-essential
```

## Usage of VisuAalWiNes

```bash
# install used npm packages
npm install

# start server
./run.sh

# start your browser and go to http://localhost:3000/
firefox http://localhost:3000/
# or
chrome http://localhost:3000/
```

## Important files

| path                            | description |
| ------------------------------- | ----------- |
| `./data/models/*`               | network models |
| `./data/models/*/topo.xml`      | topography in P-Rex format |
| `./data/models/*/routing.xml`   | routing in P-Rex format |
| `./data/models/*/queries.json`  | example queries |
| `./data/models/*/location.json` | router locations |
| `./bin/aalwines`                | binary of AalWiNes tool |
| `./bin/moped`                   | binary of moped tool |

## Building a binary delivery package

Building a package containing a binary delivery can easily be done with the command

```bash
npm run pack
```

The delivery package including aalwines, moped, sample data and the visuaalwines binary is in:

`./visuaalwines-0.3.0.tgz`

Beside the visuaalwines tool it includes everything necessary to run it: nodejs, aalwines, moped and sample data.

Unpack it, run the binary and use your browser to go to http://localhost:3000/

```bash
tar -xzvf visuaalwines-0.3.0.tgz
cd visuaalwines-0.3.0
./visuaalwines

# browse to http://localhost:3000/
```

Own sample data can be added in the directory `data/models` or via the web interface.

## Optional Requirements

### PM2 (optional)
<https://pm2.keymetrics.io/>

A process manager for Node.js. Used to keep the server running and automatically restart it on code change. Can also be used for auto-start.

```bash
# install pm2
npm install pm2 -g

# start server using pm2
./pm2.sh
```

### NGINX (optional)
<https://www.nginx.com/>

A webserver for hosting this application with HTTPS support.
