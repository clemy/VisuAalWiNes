let current_data = null;
let current_step;
let current_step_target;
let current_step_lastanimation = 0;
let deckgl;
let layerRouter;
let layerEdges;
let layerUsedEdges;
let layerText;
let currentViewState = {
    latitude: 0,
    longitude: 0,
    zoom: 4,
    pitch: 40
};
let view_all = false;
let top_down = false;
let usedEdgesCount = 0;

function map_init() {
    const apiKey = 'pk.eyJ1IjoiY2xlbXkiLCJhIjoiY2s1aHh1eXVwMDVoMTNvbW43ODc5a2YzbyJ9.VqOH4UuphpLFCEBw8Px-VQ';

    layerRouter = new deck.ScatterplotLayer({
        id: 'routers',
        data: [],
        opacity: 0.8,
        stroked: true,
        filled: true,
        radiusScale: 6,
        radiusMinPixels: 1,
        radiusMaxPixels: 100,
        lineWidthMinPixels: 1,
        getPosition: d => [d.lng, d.lat, 0],
        getRadius: 10,
        getFillColor: d => d.mode <= current_step ? [255, 140, 0] : [0, 37, 63],
        getLineColor: d => [0, 92, 155],
        updateTriggers: {
            getFillColor: [current_step]
        },
        transitions: {
            getFillColor: 200
        }
    });

    layerEdges = new deck.ArcLayer({
        id: 'edges',
        data: [],
        // Styles
        getSourcePosition: d => [d.source.lng, d.source.lat, 0],
        getTargetPosition: d => [d.target.lng, d.target.lat, 0],
        getSourceColor: [0, 46, 79],
        getTargetColor: [230, 230, 230],
        getWidth: 8,
        getTilt: 20
    });

    layerUsedEdges = new deck.ArcLayer({
        id: 'usedEdges',
        pickable: true,
        autoHighlight: true,
        highlightColor: [230, 230, 0, 196],
        onClick: (info, event) => set_current_step(info.object.step),
        data: [],
        // Styles
        getSourcePosition: d => [d.source.lng, d.source.lat, 0],
        getTargetPosition: d => [d.target.lng, d.target.lat, 0],
        getSourceColor: d => d.step <= current_step ? [128, 32, 32]: [0, 46, 79],
        getTargetColor: d => d.step <= current_step ? [255, 32, 32] : [230, 230, 230],
        getWidth: 8,
        getTilt: 20,
        updateTriggers: {
            getSourceColor: [current_step],
            getTargetColor: [current_step]
        },
        transitions: {
            getSourceColor: 200,
            getTargetColor: 200
        }
    });

    layerText = new deck.TextLayer({
        id: 'text-layer',
        data: [],
        getPosition: d => [d.lng, d.lat, 10],
        getText: d => d.name,
        getSize: 32,
        getAngle: 0,
        getTextAnchor: 'start',
        getAlignmentBaseline: 'top',
        //getPixelOffset: [0, 10],
        billboard: true,
        parameters: {
            depthTest: false
        },
        getColor: [255,255,255],
        //backgroundColor: [0, 0, 128, 0.5]
    });

    deckgl = new deck.DeckGL({
        container: 'visualization',
        mapboxApiAccessToken: apiKey,
        mapStyle: 'mapbox://styles/mapbox/traffic-night-v2',

        viewState: currentViewState,
        onViewStateChange: ({viewState}) => {
            currentViewState = viewState;
            deckgl.setProps({viewState: currentViewState});
        },
        controller: {touchRotate: true},

        pickingRadius: 20,

        layers: [
            layerRouter,
            layerEdges,
            layerUsedEdges,
            layerText
        ]
    });

    $("#view-all").change(function () {
        view_all = $("#view-all").prop('checked');
        update_deck();
    });

    $("#top-down").click(function () {
        top_down = $("#top-down").prop('checked');
        currentViewState = Object.assign({}, currentViewState, {
            bearing: top_down ? 0 : -32,
            pitch: top_down ? 0 : 40,
            transitionDuration: 1000,
            transitionInterpolator: new deck.FlyToInterpolator()
        });
        deckgl.setProps({viewState: currentViewState});
    });
}

function show_simulation(data) {
    data.first_time = 1;
    data.first_time = 100;

    current_data = data;
    const routers = Object.keys(data.routers).map(e => Object.assign({}, data.routers[e], {name: e}));
    // flatMap targets
    const edges = routers.reduce((acc, e) => acc.concat(e.targets
        .filter(t => data.routers[t] !== undefined)
        .filter(t => e.usedTargets === undefined || !e.usedTargets.includes(t))
        .map(t => {
        return {
            source: {name: e.name, lng: e.lng, lat: e.lat},
            target: {name: t, lng: data.routers[t].lng, lat: data.routers[t].lat}
        };
    })), []);
    const usedEdges = routers.reduce((acc, e) => e.traceInfo !== undefined ? acc.concat(e.traceInfo.filter(t => data.routers[t.target] !== undefined).map(t => {
        return {
            source: {name: e.name, lng: e.lng, lat: e.lat},
            target: {name: t.target, lng: data.routers[t.target].lng, lat: data.routers[t.target].lat},
            step: t.step
        };
    })) : acc, []);
    layerRouter = layerRouter.clone({data: routers});
    layerEdges = layerEdges.clone({data: edges});
    layerUsedEdges = layerUsedEdges.clone({data: usedEdges});
    layerText = layerText.clone({data: routers});
    update_deck();

    const bounds = [[data.minLng, data.minLat], [data.maxLng, data.maxLat]];
    const {viewport} = layerRouter.context;
    const {longitude, latitude, zoom} = viewport.fitBounds(bounds);
    currentViewState = Object.assign({}, currentViewState, {
        longitude,
        latitude,
        zoom: zoom - 1,
        bearing: top_down ? 0 : -32,
        pitch: top_down ? 0 : 40,
        transitionDuration: 3000,
        transitionInterpolator: new deck.FlyToInterpolator()
    });
    deckgl.setProps({viewState: currentViewState});
    current_step = 0;
    usedEdgesCount = usedEdges.length;
    set_current_step(usedEdgesCount);
}

function set_current_step(step) {
    current_step_target = step;
    // should cancel previous one (performance)
    requestAnimationFrame(animate_current_step);
}

function animate_current_step(time) {
    if (current_step == current_step_target) {
        return;
    }

    // we should calculate the missing steps based on the time diff
    if (current_step_lastanimation + 200 < time) {
        current_step_lastanimation = time;
        
        current_step += Math.sign(current_step_target - current_step);

        layerRouter = layerRouter.clone({
            updateTriggers: {
                getFillColor: [current_step]
            }
        });
        layerUsedEdges = layerUsedEdges.clone({
            updateTriggers: {
                getSourceColor: [current_step],
                getTargetColor: [current_step]
            }
        });
        update_deck();
    }

    if (current_step != current_step_target) {
        requestAnimationFrame(animate_current_step);
    }
}

function update_deck() {
    layerEdges = layerEdges.clone({ visible: view_all || usedEdgesCount == 0 });
    deckgl.setProps({layers: [layerRouter, layerEdges, layerUsedEdges, layerText]});
}
