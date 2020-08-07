class ArrowArcLayer extends deck.ArcLayer {
    _getModel(gl) {
        let positions = [];
        const NUM_SEGMENTS = 50;
        const POS_ARROW = 35;
        /*
        *  (0, -1)-------------_(1, -1)
        *       |          _,-"  |
        *       o      _,-"      o
        *       |  _,-"          |
        *   (0, 1)"-------------(1, 1)
        */

        // draw triangle strip up to the wide side of the arrow
        for (let i = 0; i <= POS_ARROW; i++) {
            positions = positions.concat([i, 1, 0, i, -1, 0]);
        }

        // add 2 (degenerated) triangles (same x position) to widen the triangle strip
        positions = positions.concat([POS_ARROW, 4, 0, POS_ARROW, -4, 0]);

        // continue with small triangle strip at the front of the arrow effectively drawing the arrow as a trapezoid out of 2 triangles
        //   the arrow length/width ratio depends on the length of the path, this could be improved..
        for (let i = POS_ARROW + 1; i < NUM_SEGMENTS; i++) {
            positions = positions.concat([i, 1, 0, i, -1, 0]);
        }

        const model = new luma.Model(
            gl,
            Object.assign({}, this.getShaders(), {
                id: this.props.id,
                geometry: new luma.Geometry({
                    drawMode: luma.Geometry.DRAW_MODE.TRIANGLE_STRIP,
                    attributes: {
                        positions: new Float32Array(positions)
                    }
                }),
                isInstanced: true
            })
        );

        model.setUniforms({ numSegments: NUM_SEGMENTS });

        return model;
    }
}
