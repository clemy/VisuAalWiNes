# prexvis

## A visualization frontend for the AalWiNes tool
This project is based on code from the VisuAAL project (github:petergjoel/VisuAAL) by Peter G. Jensen.

## Requirements

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

## Usage of prexvis

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

| path                          | description |
| ----------------------------- | ----------- |
| `./data/models/*`             | network models |
| `./data/models/*/topo.xml`    | topography in P-Rex format |
| `./data/models/*/routing.xml` | routing in P-Rex format |
| `./bin/aalwines`              | binary of AalWiNes tool |
| `./bin/moped`                 | binary of moped tool |

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
